package com.ebu6304.tarecruit;

import com.ebu6304.tarecruit.api.ApiException;
import com.ebu6304.tarecruit.auth.JwtHelper;
import com.ebu6304.tarecruit.domain.ActivityLogRecord;
import com.ebu6304.tarecruit.domain.ApplicationEvaluationRecord;
import com.ebu6304.tarecruit.domain.ApplicationRecord;
import com.ebu6304.tarecruit.domain.AssignmentRecord;
import com.ebu6304.tarecruit.domain.Counters;
import com.ebu6304.tarecruit.domain.CvFileRecord;
import com.ebu6304.tarecruit.domain.JobFavoriteRecord;
import com.ebu6304.tarecruit.domain.JobTemplatesFile;
import com.ebu6304.tarecruit.domain.JobRecord;
import com.ebu6304.tarecruit.domain.NotificationRecord;
import com.ebu6304.tarecruit.domain.SettingsRecord;
import com.ebu6304.tarecruit.domain.UserRecord;
import com.ebu6304.tarecruit.store.AtomicJsonFile;
import com.ebu6304.tarecruit.user.UserRole;
import com.ebu6304.tarecruit.user.UserService;
import com.fasterxml.jackson.core.type.TypeReference;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.stream.Collectors;

public final class TaRecruitService {
  public static final String CTX_ATTR = TaRecruitService.class.getName();

  private final Path usersPath;
  private final Path jobsPath;
  private final Path applicationsPath;
  private final Path notificationsPath;
  private final Path assignmentsPath;
  private final Path activityLogsPath;
  private final Path countersPath;
  private final Path settingsPath;
  private final Path evaluationsPath;
  private final Path favoritesPath;
  private final Path cvFilesPath;
  private final Path uploadsDir;
  private final Path cvPayloadsDir;
  private final Path jobTemplatesPath;
  private final JwtHelper jwt;
  private final double maxTaHoursDefault;
  private final UserService userAccounts;
  private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();

  private static final Set<String> RECRUITING = Set.of("open", "screening", "interview", "shortlist");
  private static final int MAX_LOGIN_FAILS = 5;
  private static final int LOCKOUT_MINUTES = 15;

  public TaRecruitService(Path dataDir, JwtHelper jwt, double maxTaHoursDefault) {
    this.usersPath = dataDir.resolve("users.json");
    this.jobsPath = dataDir.resolve("jobs.json");
    this.applicationsPath = dataDir.resolve("applications.json");
    this.notificationsPath = dataDir.resolve("notifications.json");
    this.assignmentsPath = dataDir.resolve("assignments.json");
    this.activityLogsPath = dataDir.resolve("activity_logs.json");
    this.countersPath = dataDir.resolve("counters.json");
    this.settingsPath = dataDir.resolve("settings.json");
    this.evaluationsPath = dataDir.resolve("application_evaluations.json");
    this.favoritesPath = dataDir.resolve("job_favorites.json");
    this.cvFilesPath = dataDir.resolve("cv_files.json");
    this.uploadsDir = dataDir.resolve("uploads");
    this.cvPayloadsDir = dataDir.resolve("cv_payloads");
    this.jobTemplatesPath = dataDir.resolve("job_templates.json");
    this.jwt = jwt;
    this.maxTaHoursDefault = maxTaHoursDefault;
    this.userAccounts = UserService.forPath(this.usersPath);
  }

  public Path getUploadsDir() {
    return uploadsDir;
  }

  public void initEmptyFiles() throws IOException {
    rw.writeLock().lock();
    try {
      ensureFile(usersPath, new ArrayList<UserRecord>());
      ensureFile(jobsPath, new ArrayList<JobRecord>());
      ensureFile(applicationsPath, new ArrayList<ApplicationRecord>());
      ensureFile(notificationsPath, new ArrayList<NotificationRecord>());
      ensureFile(assignmentsPath, new ArrayList<AssignmentRecord>());
      ensureFile(activityLogsPath, new ArrayList<ActivityLogRecord>());
      ensureFile(evaluationsPath, new ArrayList<ApplicationEvaluationRecord>());
      ensureFile(favoritesPath, new ArrayList<JobFavoriteRecord>());
      ensureFile(cvFilesPath, new ArrayList<CvFileRecord>());
      if (!java.nio.file.Files.exists(settingsPath)) {
        AtomicJsonFile.writeAtomic(settingsPath, new SettingsRecord());
      }
      if (!java.nio.file.Files.exists(countersPath)) {
        AtomicJsonFile.writeAtomic(countersPath, new Counters());
      }
      java.nio.file.Files.createDirectories(uploadsDir);
      java.nio.file.Files.createDirectories(cvPayloadsDir);
      ensureJobTemplatesFile();
    } finally {
      rw.writeLock().unlock();
    }
  }

  private void ensureJobTemplatesFile() throws IOException {
    if (!java.nio.file.Files.exists(jobTemplatesPath)) {
      AtomicJsonFile.writeAtomic(jobTemplatesPath, JobTemplatesFile.defaults());
    }
  }

  public void ensureSeedAdmin(String email, String password) {
    if (email == null || email.isBlank() || password == null) {
      return;
    }
    try {
      validatePasswordStrength(password);
    } catch (ApiException e) {
      return;
    }
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      if (users.stream().anyMatch(u -> "admin".equals(u.role))) {
        return;
      }
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      int newId = c.userSeq;
      try {
        userAccounts.persistNewStaff(newId, email.trim(), password, UserRole.ADMIN, "Administrator", null);
      } catch (IllegalArgumentException ex) {
        return;
      }
      c.userSeq = newId + 1;
      String storedEmail = email.trim().toLowerCase(Locale.ROOT);
      logActivityUnsafe(logs, c, newId, "seed_admin", "user", newId, Map.of("email", storedEmail));
      saveAll(null, null, null, null, null, logs, c);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  private static void ensureFile(Path p, Object empty) throws IOException {
    if (!java.nio.file.Files.exists(p)) {
      AtomicJsonFile.writeAtomic(p, empty);
    }
  }

  /** Health check JSON; {@code version} should match {@code pom.xml} artifact version. */
  public Map<String, String> health() {
    Map<String, String> m = new LinkedHashMap<>();
    m.put("status", "ok");
    m.put("version", "1.0.0");
    m.put("time", Instant.now().toString());
    m.put("java", System.getProperty("java.version", "unknown"));
    m.put("data_dir", usersPath.getParent().toString());
    return m;
  }

  public Map<String, Object> register(Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      String email = requireStr(body.get("email"), "email");
      String password = requireStr(body.get("password"), "password");
      UserRole role;
      try {
        role = UserRole.fromString(requireStr(body.get("role"), "role"));
      } catch (IllegalArgumentException ex) {
        throw new ApiException(422, "role must be TA or MO");
      }
      if (role != UserRole.TA && role != UserRole.MO) {
        throw new ApiException(422, "role must be TA or MO");
      }
      String studentId = optStr(body.get("student_id"));
      if (studentId == null || studentId.isBlank()) {
        throw new ApiException(400, role == UserRole.TA ? "TA accounts require student_id" : "MO accounts require staff_id");
      }
      String dn = optStr(body.get("display_name"));
      int newId = c.userSeq;
      try {
        if (role == UserRole.TA) {
          userAccounts.persistNewTa(newId, email, password, dn, studentId.strip());
        } else {
          userAccounts.persistNewStaff(newId, email, password, UserRole.MO, dn, studentId.strip());
        }
      } catch (IllegalArgumentException ex) {
        throw mapUserServiceToApi(ex);
      }
      c.userSeq = newId + 1;
      String storedEmail = email.trim().toLowerCase(Locale.ROOT);
      logActivityUnsafe(logs, c, newId, "register", "user", newId,
          Map.of("email", storedEmail, "role", role.value()));
      saveAll(null, null, null, null, null, logs, c);
      return tokenMap(newId);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> adminCreateUser(int adminId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), adminId), "admin");
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      String email = requireStr(body.get("email"), "email");
      String password = requireStr(body.get("password"), "password");
      String roleStr = requireStr(body.get("role"), "role");
      UserRole role;
      try {
        role = UserRole.fromString(roleStr);
      } catch (IllegalArgumentException ex) {
        throw new ApiException(422, "role must be mo or admin");
      }
      if (role != UserRole.MO && role != UserRole.ADMIN) {
        throw new ApiException(422, "role must be mo or admin");
      }
      String dn = optStr(body.get("display_name"));
      String studentId = optStr(body.get("student_id"));
      int newId = c.userSeq;
      try {
        userAccounts.persistNewStaff(newId, email, password, role, dn, studentId);
      } catch (IllegalArgumentException ex) {
        throw mapUserServiceToApi(ex);
      }
      c.userSeq = newId + 1;
      String storedEmail = email.trim().toLowerCase(Locale.ROOT);
      logActivityUnsafe(logs, c, adminId, "user_created_by_admin", "user", newId,
          Map.of("email", storedEmail, "role", role.value()));
      saveAll(null, null, null, null, null, logs, c);
      UserRecord fresh = requireUserUnsafe(readUsersUnsafe(), newId);
      return userOut(fresh);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> login(Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      String email = requireStr(body.get("email"), "email");
      String password = requireStr(body.get("password"), "password");
      UserRecord u = users.stream().filter(x -> x.email.equalsIgnoreCase(email)).findFirst().orElse(null);
      if (u == null) {
        throw new ApiException(401, "Invalid email or password");
      }
      if (u.locked_until != null && u.locked_until.isAfter(Instant.now())) {
        throw new ApiException(423, "Account temporarily locked; try again later");
      }
      if (!userAccounts.passwordMatches(password, u.password_hash)) {
        u.failed_login_attempts = Math.min(u.failed_login_attempts + 1, 99);
        if (u.failed_login_attempts >= MAX_LOGIN_FAILS) {
          u.locked_until = Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES);
        }
        saveAll(users, null, null, null, null, logs, c);
        throw new ApiException(401, "Invalid email or password");
      }
      u.failed_login_attempts = 0;
      u.locked_until = null;
      logActivityUnsafe(logs, c, u.id, "login", "user", u.id, Map.of("email", u.email));
      saveAll(users, null, null, null, null, logs, c);
      return tokenMap(u.id);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  private static Map<String, Object> tokenMap(int userId) {
    return Map.of("access_token", "", "token_type", "bearer", "_uid", userId);
  }

  public Map<String, Object> fillToken(Map<String, Object> partial, int userId) {
    Map<String, Object> m = new LinkedHashMap<>(partial);
    m.put("access_token", jwt.createForUserId(userId));
    m.remove("_uid");
    return m;
  }

  public Integer parseUserIdFromJwt(String bearerToken) {
    return jwt.parseUserId(bearerToken);
  }

  public UserRecord requireUser(int userId) {
    rw.readLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      return users.stream().filter(u -> u.id == userId).findFirst().orElseThrow(
          () -> new ApiException(401, "User not found"));
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> me(int userId) {
    return userOut(requireUser(userId));
  }

  public List<Map<String, Object>> listJobs(
      int userId, String q, String skill, String statusParam, String sortParam,
      Boolean favoritesOnly, Boolean unappliedOnly) {
    rw.readLock().lock();
    try {
      UserRecord user = requireUserUnsafe(readUsersUnsafe(), userId);
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<JobFavoriteRecord> favs = readFavoritesUnsafe();
      final String eff = (statusParam == null || statusParam.isBlank())
          ? ("ta".equals(user.role) ? "open" : "all")
          : statusParam.strip();
      String qn = q != null ? q.strip().toLowerCase(Locale.ROOT) : "";
      String sk = skill != null ? skill.strip().toLowerCase(Locale.ROOT) : "";
      java.util.Set<Integer> favIds = new java.util.HashSet<>();
      if (favoritesOnly != null && favoritesOnly) {
        for (JobFavoriteRecord f : favs) {
          if (f.user_id == userId) {
            favIds.add(f.job_id);
          }
        }
      }
      List<Map<String, Object>> out = jobs.stream()
          .filter(j -> {
            if (Boolean.TRUE.equals(favoritesOnly) && !favIds.contains(j.id)) {
              return false;
            }
            if ("ta".equals(user.role) && ("draft".equals(j.status) || "cancelled".equals(j.status))) {
              return false;
            }
            if ("open".equals(eff)) {
              boolean slot = isTaRecruitingSlot(j, apps);
              if ("ta".equals(user.role)) {
                return slot && !taDeadlineClosed(j);
              }
              return slot;
            }
            if ("closed".equals(eff)) {
              boolean base = "closed".equals(j.status) || "cancelled".equals(j.status) || "filled".equals(j.status);
              if ("ta".equals(user.role)) {
                return base || taDeadlineClosed(j);
              }
              return base;
            }
            if ("recruiting".equals(eff)) {
              boolean rec = RECRUITING.contains(j.status) && acceptedCount(apps, j.id) < j.quota;
              if ("ta".equals(user.role)) {
                return rec && !taDeadlineClosed(j);
              }
              return rec;
            }
            return true;
          })
          .filter(j -> {
            if (qn.isEmpty()) {
              return true;
            }
            String mn = j.module_name != null ? j.module_name.toLowerCase(Locale.ROOT) : "";
            String rq = j.requirements != null ? j.requirements.toLowerCase(Locale.ROOT) : "";
            return mn.contains(qn) || rq.contains(qn);
          })
          .filter(j -> {
            if (sk.isEmpty()) {
              return true;
            }
            String tags = j.skill_tags != null ? j.skill_tags.toLowerCase(Locale.ROOT) : "";
            String rq = j.requirements != null ? j.requirements.toLowerCase(Locale.ROOT) : "";
            return tags.contains(sk) || rq.contains(sk);
          })
          .sorted(jobComparator(sortParam))
          .map(j -> jobOut(j, favIds.contains(j.id), apps, "ta".equals(user.role)))
          .collect(Collectors.toList());
      if (Boolean.TRUE.equals(unappliedOnly) && "ta".equals(user.role)) {
        out = out.stream()
            .filter(m -> apps.stream().noneMatch(
                a -> a.job_id == (Integer) m.get("id") && a.ta_user_id == userId
                    && !"withdrawn".equals(a.status)))
            .collect(Collectors.toList());
      }
      return out;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> applyJob(int userId, int jobId) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord user = requireRole(requireUserUnsafe(users, userId), "ta");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      JobRecord job = jobs.stream().filter(j -> j.id == jobId).findFirst().orElseThrow(
          () -> new ApiException(404, "Job not found"));
      normalizeJob(job);
      Optional<Instant> deadlineEnd = deadlineEndInstant(job.deadline);
      if (deadlineEnd.isPresent() && Instant.now().isAfter(deadlineEnd.get())) {
        throw new ApiException(400, "Application deadline has passed");
      }
      if (!RECRUITING.contains(job.status)) {
        throw new ApiException(400, "Job is not accepting applications");
      }
      if (acceptedCount(apps, jobId) >= job.quota) {
        throw new ApiException(400, "Job quota is already filled");
      }
      if (!job.allow_duplicate_apply_same_type && !job.term.isBlank()) {
        long other = apps.stream()
            .filter(a -> a.ta_user_id == user.id && !"withdrawn".equals(a.status))
            .filter(a -> {
              JobRecord oj = jobs.stream().filter(x -> x.id == a.job_id).findFirst().orElse(null);
              return oj != null && job.job_type.equals(oj.job_type) && job.term.equals(oj.term);
            })
            .count();
        if (other > 0) {
          throw new ApiException(400, "Duplicate application for this job type and term is not allowed");
        }
      }
      ApplicationRecord existing = apps.stream()
          .filter(a -> a.job_id == jobId && a.ta_user_id == user.id)
          .findFirst().orElse(null);
      ApplicationRecord result;
      if (existing != null && !"withdrawn".equals(existing.status)) {
        if ("pending".equals(existing.status) || "interviewing".equals(existing.status)) {
          throw new ApiException(400, "Already applied");
        }
        if ("accepted".equals(existing.status) || "rejected".equals(existing.status)) {
          throw new ApiException(400, "Application already decided");
        }
      }
      if (existing != null && "withdrawn".equals(existing.status)) {
        existing.status = "pending";
        existing.decided_at = null;
        result = existing;
      } else if (existing == null) {
        ApplicationRecord a = new ApplicationRecord();
        a.id = c.applicationSeq++;
        a.job_id = jobId;
        a.ta_user_id = user.id;
        a.status = "pending";
        a.created_at = Instant.now();
        a.decided_at = null;
        apps.add(a);
        result = a;
      } else {
        throw new ApiException(400, "Already applied");
      }
      logActivityUnsafe(logs, c, user.id, "application_submitted", "application", result.id,
          Map.of("job_id", jobId));
      saveAll(users, jobs, apps, null, null, logs, c);
      return applicationOut(apps, jobs, users, result, readEvaluationsUnsafe(), null, true);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> taGetProfile(int userId) {
    rw.readLock().lock();
    try {
      UserRecord u = requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "ta");
      Map<String, Object> m = new LinkedHashMap<>(userOut(u));
      List<CvFileRecord> files = readCvFilesUnsafe();
      files.stream()
          .filter(f -> f.user_id == userId)
          .max(Comparator.comparing(f -> f.created_at != null ? f.created_at : Instant.EPOCH))
          .ifPresent(f -> {
            m.put("cv_file_id", f.id);
            m.put("cv_original_name", f.original_name);
          });
      return m;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> taPatchProfile(int userId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord user = requireRole(requireUserUnsafe(users, userId), "ta");
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      if (body.containsKey("display_name") && body.get("display_name") != null) {
        user.display_name = String.valueOf(body.get("display_name"));
      }
      if (body.containsKey("student_id") && body.get("student_id") != null) {
        String s = String.valueOf(body.get("student_id")).strip();
        user.student_id = s.isEmpty() ? null : s;
      }
      if (body.containsKey("email") && body.get("email") != null) {
        String ne = String.valueOf(body.get("email"));
        if (users.stream().anyMatch(u -> u.id != user.id && u.email.equalsIgnoreCase(ne))) {
          throw new ApiException(400, "Email already in use");
        }
        user.email = ne;
      }
      if (body.containsKey("skills") && body.get("skills") != null) {
        user.skills = String.valueOf(body.get("skills"));
      }
      if (body.containsKey("cv_file_path") && body.get("cv_file_path") != null) {
        user.cv_file_path = String.valueOf(body.get("cv_file_path"));
      }
      patchProfileStructured(user, body);
      logActivityUnsafe(logs, c, user.id, "profile_updated", "user", user.id, Map.of());
      saveAll(users, null, null, null, null, logs, c);
      return userOut(user);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public List<Map<String, Object>> taApplications(int userId) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "ta");
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<JobRecord> jobs = readJobsUnsafe();
      List<UserRecord> users = readUsersUnsafe();
      List<ApplicationEvaluationRecord> evals = readEvaluationsUnsafe();
      return apps.stream()
          .filter(a -> a.ta_user_id == userId)
          .sorted(Comparator.comparing((ApplicationRecord a) -> a.created_at).reversed())
          .map(a -> applicationOut(apps, jobs, users, a, evals, null, true))
          .collect(Collectors.toList());
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public List<Map<String, Object>> notificationsList(int userId, boolean unreadOnly, Integer sinceDays) {
    rw.readLock().lock();
    try {
      requireUserUnsafe(readUsersUnsafe(), userId);
      Instant cutoff = sinceDays != null && sinceDays > 0
          ? Instant.now().minus(sinceDays, ChronoUnit.DAYS)
          : null;
      List<NotificationRecord> list = readNotificationsUnsafe();
      return list.stream()
          .filter(n -> n.user_id == userId)
          .filter(n -> !unreadOnly || !n.read)
          .filter(n -> cutoff == null || (n.created_at != null && !n.created_at.isBefore(cutoff)))
          .sorted(Comparator.comparing((NotificationRecord n) -> n.created_at).reversed())
          .map(TaRecruitService::notificationOut)
          .collect(Collectors.toList());
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> notificationsMarkRead(int userId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      requireUserUnsafe(readUsersUnsafe(), userId);
      List<NotificationRecord> list = readNotificationsUnsafe();
      @SuppressWarnings("unchecked")
      List<Number> ids = body != null ? (List<Number>) body.get("notification_ids") : null;
      boolean filterIds = ids != null && !ids.isEmpty();
      java.util.Set<Integer> idSet = new java.util.HashSet<>();
      if (filterIds) {
        for (Number n : ids) {
          idSet.add(n.intValue());
        }
      }
      for (NotificationRecord n : list) {
        if (n.user_id != userId) {
          continue;
        }
        if (!filterIds || idSet.contains(n.id)) {
          n.read = true;
        }
      }
      saveNotifications(list);
      return Map.of("ok", true);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> withdrawApplication(int userId, int applicationId) {
    rw.writeLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "ta");
      List<UserRecord> users = readUsersUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<JobRecord> jobs = readJobsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      ApplicationRecord a = apps.stream().filter(x -> x.id == applicationId).findFirst().orElseThrow(
          () -> new ApiException(404, "Application not found"));
      if (a.ta_user_id != userId) {
        throw new ApiException(403, "Not your application");
      }
      if (!"pending".equals(a.status)) {
        throw new ApiException(400, "Only pending applications can be withdrawn");
      }
      a.status = "withdrawn";
      logActivityUnsafe(logs, c, userId, "application_withdrawn", "application", a.id,
          Map.of("job_id", a.job_id));
      saveAll(users, jobs, apps, null, null, logs, c);
      return applicationOut(apps, jobs, users, a, readEvaluationsUnsafe(), null, true);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public List<Map<String, Object>> moJobs(int userId, String statusFilter) {
    rw.readLock().lock();
    try {
      UserRecord mo = requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      final String sf = statusFilter != null ? statusFilter.strip() : "";
      return jobs.stream()
          .filter(j -> j.created_by == mo.id)
          .filter(j -> sf.isEmpty() || sf.equalsIgnoreCase(j.status))
          .sorted(Comparator.comparing((JobRecord j) -> j.created_at).reversed())
          .map(j -> jobOut(j, false, apps))
          .collect(Collectors.toList());
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public List<Map<String, Object>> moListJobTemplates(int userId) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "mo");
      JobTemplatesFile tf = readJobTemplatesFile();
      List<Map<String, Object>> out = new ArrayList<>();
      for (Map<String, Object> b : tf.built_ins) {
        Map<String, Object> m = new LinkedHashMap<>(b);
        m.put("built_in", true);
        out.add(m);
      }
      for (Map<String, Object> s : tf.saved) {
        Object mo = s.get("mo_user_id");
        if (mo instanceof Number n && n.intValue() == userId) {
          Map<String, Object> m = new LinkedHashMap<>(s);
          m.put("built_in", false);
          out.add(m);
        }
      }
      return out;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> moSaveJobTemplate(int userId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      UserRecord mo = requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "mo");
      String name = requireStr(body.get("name"), "name");
      JobTemplatesFile tf = readJobTemplatesFile();
      String sid = "mo" + mo.id + "_" + name.replaceAll("[^a-zA-Z0-9_-]+", "_");
      Map<String, Object> row = new LinkedHashMap<>();
      row.put("saved_id", sid);
      row.put("mo_user_id", mo.id);
      row.put("name", name);
      row.put("module_name", optStr(body.get("module_name")) != null ? optStr(body.get("module_name")) : "");
      row.put("requirements", optStr(body.get("requirements")) != null ? optStr(body.get("requirements")) : "");
      row.put("skill_tags", optStr(body.get("skill_tags")) != null ? optStr(body.get("skill_tags")) : "");
      row.put("assigned_hours", body.get("assigned_hours") instanceof Number n ? n.doubleValue() : 5.0);
      row.put("quota", body.get("quota") instanceof Number n ? Math.max(1, n.intValue()) : 1);
      row.put("job_type", optStr(body.get("job_type")) != null ? optStr(body.get("job_type")) : "course_ta");
      row.put("term", optStr(body.get("term")) != null ? optStr(body.get("term")) : "");
      row.put("schedule_text", optStr(body.get("schedule_text")) != null ? optStr(body.get("schedule_text")) : "");
      row.put("allow_duplicate_apply_same_type", Boolean.TRUE.equals(body.get("allow_duplicate_apply_same_type"))
          || "true".equalsIgnoreCase(String.valueOf(body.get("allow_duplicate_apply_same_type"))));
      tf.saved.removeIf(x -> sid.equals(String.valueOf(x.get("saved_id"))));
      tf.saved.add(row);
      AtomicJsonFile.writeAtomic(jobTemplatesPath, tf);
      row.put("built_in", false);
      return row;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> moCreateJob(int userId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord mo = requireRole(requireUserUnsafe(users, userId), "mo");
      mergeJobTemplateIntoCreateBody(mo.id, body);
      List<JobRecord> jobs = readJobsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      SettingsRecord st = readSettingsMergedUnsafe();
      String moduleName = requireStr(body.get("module_name"), "module_name");
      if (moduleName.isEmpty()) {
        throw new ApiException(422, "module_name: ensure this value has at least 1 characters");
      }
      JobRecord j = new JobRecord();
      j.id = c.jobSeq++;
      j.module_name = moduleName;
      j.requirements = optStr(body.get("requirements"));
      if (j.requirements == null) {
        j.requirements = "";
      }
      j.deadline = optStr(body.get("deadline"));
      if (j.deadline == null) {
        j.deadline = "";
      }
      j.skill_tags = optStr(body.get("skill_tags"));
      if (j.skill_tags == null) {
        j.skill_tags = "";
      }
      j.assigned_hours = asDouble(body.get("assigned_hours"), 5.0);
      if (j.assigned_hours < 0) {
        throw new ApiException(422, "assigned_hours must be >= 0");
      }
      int defQ = st.default_job_quota > 0 ? st.default_job_quota : 1;
      j.quota = body.get("quota") instanceof Number n ? Math.max(1, n.intValue()) : defQ;
      j.job_type = optStr(body.get("job_type"));
      if (j.job_type == null || j.job_type.isBlank()) {
        j.job_type = "course_ta";
      }
      j.term = optStr(body.get("term"));
      if (j.term == null) {
        j.term = "";
      }
      if (j.term.isBlank() && st.semester_label != null && !st.semester_label.isBlank()) {
        j.term = st.semester_label.strip();
      }
      j.schedule_text = optStr(body.get("schedule_text"));
      if (j.schedule_text == null) {
        j.schedule_text = "";
      }
      if (body.containsKey("allow_duplicate_apply_same_type")) {
        j.allow_duplicate_apply_same_type = Boolean.TRUE.equals(body.get("allow_duplicate_apply_same_type"))
            || "true".equalsIgnoreCase(String.valueOf(body.get("allow_duplicate_apply_same_type")));
      }
      String initial = optStr(body.get("initial_status"));
      if (initial != null && !initial.isBlank()) {
        j.status = initial.strip();
      } else {
        j.status = Boolean.TRUE.equals(body.get("publish")) ? "open" : "draft";
      }
      j.created_by = mo.id;
      Instant now = Instant.now();
      j.created_at = now;
      j.updated_at = now;
      jobs.add(j);
      logActivityUnsafe(logs, c, mo.id, "job_created", "job", j.id, Map.of("module_name", j.module_name));
      saveAll(users, jobs, null, null, null, logs, c);
      List<ApplicationRecord> appsForCount = readApplicationsUnsafe();
      return jobOut(j, false, appsForCount);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> moUpdateJob(int userId, int jobId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord mo = requireRole(requireUserUnsafe(users, userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      JobRecord job = ensureOwnJob(jobs, jobId, mo.id);
      if (body.containsKey("module_name") && body.get("module_name") != null) {
        job.module_name = String.valueOf(body.get("module_name"));
      }
      if (body.containsKey("requirements") && body.get("requirements") != null) {
        job.requirements = String.valueOf(body.get("requirements"));
      }
      if (body.containsKey("deadline") && body.get("deadline") != null) {
        job.deadline = String.valueOf(body.get("deadline"));
      }
      if (body.containsKey("skill_tags") && body.get("skill_tags") != null) {
        job.skill_tags = String.valueOf(body.get("skill_tags"));
      }
      if (body.containsKey("assigned_hours") && body.get("assigned_hours") != null) {
        double ah = asDouble(body.get("assigned_hours"), job.assigned_hours);
        if (ah < 0) {
          throw new ApiException(422, "assigned_hours must be >= 0");
        }
        job.assigned_hours = ah;
      }
      if (body.containsKey("quota") && body.get("quota") != null) {
        job.quota = Math.max(1, ((Number) body.get("quota")).intValue());
      }
      if (body.containsKey("job_type") && body.get("job_type") != null) {
        job.job_type = String.valueOf(body.get("job_type"));
      }
      if (body.containsKey("term") && body.get("term") != null) {
        job.term = String.valueOf(body.get("term"));
      }
      if (body.containsKey("schedule_text") && body.get("schedule_text") != null) {
        job.schedule_text = String.valueOf(body.get("schedule_text"));
      }
      if (body.containsKey("allow_duplicate_apply_same_type")) {
        job.allow_duplicate_apply_same_type =
            Boolean.TRUE.equals(body.get("allow_duplicate_apply_same_type"));
      }
      job.updated_at = Instant.now();
      logActivityUnsafe(logs, c, mo.id, "job_updated", "job", job.id, Map.of());
      saveAll(users, jobs, null, null, null, logs, c);
      List<ApplicationRecord> appsForCount = readApplicationsUnsafe();
      return jobOut(job, false, appsForCount);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> moCloseJob(int userId, int jobId) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord mo = requireRole(requireUserUnsafe(users, userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      JobRecord job = ensureOwnJob(jobs, jobId, mo.id);
      job.status = "closed";
      job.updated_at = Instant.now();
      logActivityUnsafe(logs, c, mo.id, "job_closed", "job", job.id, Map.of());
      saveAll(users, jobs, null, null, null, logs, c);
      List<ApplicationRecord> appsForCount = readApplicationsUnsafe();
      return jobOut(job, false, appsForCount);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> moTransitionJob(int userId, int jobId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord mo = requireRole(requireUserUnsafe(users, userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      JobRecord job = ensureOwnJob(jobs, jobId, mo.id);
      String to = requireStr(body.get("to"), "to");
      if (!isAllowedJobTransition(job.status, to)) {
        throw new ApiException(400, "Invalid status transition: " + job.status + " -> " + to);
      }
      job.status = to;
      job.updated_at = Instant.now();
      logActivityUnsafe(logs, c, mo.id, "job_status_changed", "job", job.id,
          Map.of("to", to));
      saveAll(users, jobs, null, null, null, logs, c);
      List<ApplicationRecord> appsForCount = readApplicationsUnsafe();
      return jobOut(job, false, appsForCount);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public List<Map<String, Object>> moJobApplicants(
      int userId, int jobId, String sortBy, String statusFilter) {
    rw.readLock().lock();
    try {
      UserRecord mo = requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      ensureOwnJob(jobs, jobId, mo.id);
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<UserRecord> users = readUsersUnsafe();
      List<ApplicationEvaluationRecord> evals = readEvaluationsUnsafe();
      List<CvFileRecord> cvFiles = readCvFilesUnsafe();
      final String st = statusFilter != null ? statusFilter.strip() : "";
      Comparator<ApplicationRecord> cmp = Comparator.comparing((ApplicationRecord a) -> a.created_at).reversed();
      if ("total_score".equalsIgnoreCase(sortBy)) {
        cmp = Comparator.comparingInt(
            (ApplicationRecord a) -> -evaluationTotal(evals, a.id));
      } else if ("skill_match".equalsIgnoreCase(sortBy)) {
        cmp = Comparator.comparingInt(
            (ApplicationRecord a) -> -evaluationSkill(evals, a.id));
      }
      return apps.stream()
          .filter(a -> a.job_id == jobId)
          .filter(a -> st.isEmpty() || st.equalsIgnoreCase(a.status))
          .sorted(cmp)
          .map(a -> applicationOut(apps, jobs, users, a, evals, cvFiles, false))
          .collect(Collectors.toList());
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> moDecideApplication(int userId, int applicationId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord mo = requireRole(requireUserUnsafe(users, userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<NotificationRecord> notifs = readNotificationsUnsafe();
      List<AssignmentRecord> assigns = readAssignmentsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      SettingsRecord settings = readSettingsMergedUnsafe();
      String status = requireStr(body.get("status"), "status");
      if (!"interviewing".equals(status) && !"accepted".equals(status) && !"rejected".equals(status)) {
        throw new ApiException(400, "Status must be interviewing, accepted or rejected");
      }
      ApplicationRecord appRow = apps.stream().filter(a -> a.id == applicationId).findFirst().orElseThrow(
          () -> new ApiException(404, "Application not found"));
      JobRecord job = ensureOwnJob(jobs, appRow.job_id, mo.id);
      normalizeJob(job);
      if (!isAllowedApplicationTransition(appRow.status, status)) {
        throw new ApiException(400, "Invalid application status transition: " + appRow.status + " -> " + status);
      }
      if ("accepted".equals(status)) {
        int acc = acceptedCount(apps, job.id);
        if (acc >= job.quota) {
          throw new ApiException(400, "Job quota is already filled");
        }
      }
      List<String> warnings = new ArrayList<>();
      if ("accepted".equals(status)) {
        warnings.addAll(computeAssignmentWarnings(users, assigns, jobs, job, appRow.ta_user_id, settings));
      }
      appRow.status = status;
      if ("accepted".equals(status) || "rejected".equals(status)) {
        appRow.decided_at = Instant.now();
      } else {
        appRow.decided_at = null;
      }
      String title;
      String bodyText;
      if ("accepted".equals(status)) {
        title = "Application accepted";
        bodyText = "Your application for \"" + job.module_name + "\" was accepted.";
      } else if ("rejected".equals(status)) {
        title = "Application rejected";
        bodyText = "Your application for \"" + job.module_name + "\" was rejected.";
      } else {
        title = "Application moved to interview";
        bodyText = "Your application for \"" + job.module_name + "\" moved to interviewing.";
      }
      NotificationRecord n = new NotificationRecord();
      n.id = c.notificationSeq++;
      n.user_id = appRow.ta_user_id;
      n.title = title;
      n.body = bodyText;
      n.application_id = appRow.id;
      n.read = false;
      n.created_at = Instant.now();
      n.category = "decision";
      n.link_job_id = job.id;
      n.link_application_id = appRow.id;
      if (settings.notifications_enabled) {
        notifs.add(n);
      }
      if ("accepted".equals(status)) {
        boolean dup = assigns.stream().anyMatch(x -> x.application_id == appRow.id);
        if (!dup) {
          AssignmentRecord asg = new AssignmentRecord();
          asg.id = c.assignmentSeq++;
          asg.ta_user_id = appRow.ta_user_id;
          asg.job_id = job.id;
          asg.application_id = appRow.id;
          asg.assigned_hours = job.assigned_hours;
          asg.term = !job.term.isBlank() ? job.term : "2025-2026-1";
          asg.created_at = Instant.now();
          assigns.add(asg);
        }
        if (acceptedCount(apps, job.id) >= job.quota) {
          job.status = "filled";
          job.updated_at = Instant.now();
        }
      }
      List<ApplicationEvaluationRecord> evalsSnap = readEvaluationsUnsafe();
      ApplicationEvaluationRecord evSnap = findEvaluation(evalsSnap, appRow.id);
      Map<String, Object> decisionLog = new LinkedHashMap<>();
      decisionLog.put("job_id", job.id);
      decisionLog.put("ta_id", appRow.ta_user_id);
      decisionLog.put("decision", status);
      if (evSnap != null) {
        decisionLog.put("total_score", scoreSum(evSnap));
        decisionLog.put("label", evSnap.label != null ? evSnap.label : "");
        if (evSnap.decision_note != null && !evSnap.decision_note.isBlank()) {
          decisionLog.put("decision_note", evSnap.decision_note);
        }
      }
      logActivityUnsafe(logs, c, mo.id, "application_" + status, "application", appRow.id, decisionLog);
      saveAll(users, jobs, apps, notifs, assigns, logs, c);
      Map<String, Object> res = new LinkedHashMap<>(
          applicationOut(apps, jobs, users, appRow, readEvaluationsUnsafe(), readCvFilesUnsafe(), false));
      res.put("warnings", warnings);
      return res;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> moBatchApplicationDecision(int userId, int jobId, Map<String, Object> body) {
    rw.readLock().lock();
    try {
      UserRecord mo = requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "mo");
      ensureOwnJob(readJobsUnsafe(), jobId, mo.id);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
    @SuppressWarnings("unchecked")
    List<Number> ids = (List<Number>) body.get("application_ids");
    String status = requireStr(body.get("status"), "status");
    if (!"rejected".equals(status) && !"accepted".equals(status) && !"interviewing".equals(status)) {
      throw new ApiException(400, "status must be interviewing, accepted or rejected");
    }
    if (ids == null || ids.isEmpty()) {
      throw new ApiException(400, "application_ids required");
    }
    int ok = 0;
    List<String> errors = new ArrayList<>();
    for (Number n : ids) {
      try {
        moDecideApplication(userId, n.intValue(), Map.of("status", status));
        ok++;
      } catch (ApiException ex) {
        errors.add(n + ": " + ex.getMessage());
      }
    }
    return Map.of("updated", ok, "errors", errors);
  }

  public String moExportJobCsv(int userId, int jobId) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord mo = requireRole(requireUserUnsafe(users, userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      JobRecord job = ensureOwnJob(jobs, jobId, mo.id);
      StringBuilder sb = new StringBuilder();
      sb.append("display_name,email,student_id,status,applied_at\n");
      for (ApplicationRecord a : apps) {
        if (a.job_id != jobId) {
          continue;
        }
        UserRecord ta = users.stream().filter(u -> u.id == a.ta_user_id).findFirst().orElse(null);
        sb.append(csv(ta != null ? ta.display_name : ""));
        sb.append(',');
        sb.append(csv(ta != null ? ta.email : ""));
        sb.append(',');
        sb.append(csv(ta != null && ta.student_id != null ? ta.student_id : ""));
        sb.append(',');
        sb.append(csv(a.status));
        sb.append(',');
        sb.append(csv(a.created_at != null ? a.created_at.toString() : ""));
        sb.append('\n');
      }
      logActivityUnsafe(logs, c, mo.id, "job_export_csv", "job", job.id, Map.of());
      saveAll(users, jobs, apps, null, null, logs, c);
      return sb.toString();
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public List<Map<String, Object>> adminWorkload(int userId, Double maxHoursParam) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "admin");
      SettingsRecord st = readSettingsMergedUnsafe();
      double cap = maxHoursParam != null ? maxHoursParam : st.overload_threshold_hours;
      List<UserRecord> users = readUsersUnsafe();
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      Map<Integer, Double> totals = computeTaAppliedWeeklyHours(apps, jobs);
      return users.stream()
          .filter(u -> "ta".equals(u.role))
          .map(u -> {
            double th = totals.getOrDefault(u.id, 0.0);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("ta_user_id", u.id);
            row.put("display_name", u.display_name);
            row.put("email", u.email);
            row.put("total_hours", th);
            row.put("overloaded", th > cap);
            row.put("weekly_over_20", th > 20.0);
            return row;
          })
          .sorted(Comparator.comparing((Map<String, Object> m) -> (Double) m.get("total_hours")).reversed())
          .collect(Collectors.toList());
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public String adminWorkloadExportCsv(int userId) {
    rw.readLock().lock();
    try {
      List<Map<String, Object>> rows = adminWorkload(userId, null);
      StringBuilder sb = new StringBuilder();
      sb.append("ta_user_id,display_name,email,total_hours,overloaded\n");
      for (Map<String, Object> r : rows) {
        sb.append(r.get("ta_user_id")).append(',');
        sb.append(csv(String.valueOf(r.get("display_name")))).append(',');
        sb.append(csv(String.valueOf(r.get("email")))).append(',');
        sb.append(r.get("total_hours")).append(',');
        sb.append(r.get("overloaded")).append('\n');
      }
      return sb.toString();
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> adminGetSettings(int userId) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "admin");
      SettingsRecord s = readSettingsMergedUnsafe();
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("max_ta_hours_default", s.max_ta_hours_default);
      m.put("notifications_enabled", s.notifications_enabled);
      m.put("term_start", s.term_start);
      m.put("term_end", s.term_end);
      m.put("skill_dictionary", s.skill_dictionary);
      m.put("overload_threshold_hours", s.overload_threshold_hours);
      m.put("default_job_quota", s.default_job_quota);
      m.put("semester_label", s.semester_label != null ? s.semester_label : "");
      return m;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> adminPatchSettings(int userId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "admin");
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      SettingsRecord s = readSettingsMergedUnsafe();
      if (body.containsKey("max_ta_hours_default") && body.get("max_ta_hours_default") != null) {
        s.max_ta_hours_default = asDouble(body.get("max_ta_hours_default"), s.max_ta_hours_default);
      }
      if (body.containsKey("notifications_enabled")) {
        s.notifications_enabled = Boolean.TRUE.equals(body.get("notifications_enabled"));
      }
      if (body.containsKey("term_start") && body.get("term_start") != null) {
        s.term_start = String.valueOf(body.get("term_start"));
      }
      if (body.containsKey("term_end") && body.get("term_end") != null) {
        s.term_end = String.valueOf(body.get("term_end"));
      }
      if (body.containsKey("overload_threshold_hours") && body.get("overload_threshold_hours") != null) {
        s.overload_threshold_hours = asDouble(body.get("overload_threshold_hours"), s.overload_threshold_hours);
      }
      @SuppressWarnings("unchecked")
      List<String> dict = (List<String>) body.get("skill_dictionary");
      if (dict != null) {
        s.skill_dictionary = new ArrayList<>(dict);
      }
      if (body.containsKey("default_job_quota") && body.get("default_job_quota") != null) {
        s.default_job_quota = Math.max(1, ((Number) body.get("default_job_quota")).intValue());
      }
      if (body.containsKey("semester_label") && body.get("semester_label") != null) {
        s.semester_label = String.valueOf(body.get("semester_label"));
      }
      saveSettingsUnsafe(s);
      logActivityUnsafe(logs, c, userId, "config_changed", "settings", null, Map.of());
      saveAll(null, null, null, null, null, logs, c);
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("max_ta_hours_default", s.max_ta_hours_default);
      m.put("notifications_enabled", s.notifications_enabled);
      m.put("term_start", s.term_start);
      m.put("term_end", s.term_end);
      m.put("skill_dictionary", s.skill_dictionary);
      m.put("overload_threshold_hours", s.overload_threshold_hours);
      m.put("default_job_quota", s.default_job_quota);
      m.put("semester_label", s.semester_label != null ? s.semester_label : "");
      return m;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> taDashboard(int userId) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "ta");
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<JobRecord> jobs = readJobsUnsafe();
      List<NotificationRecord> notifs = readNotificationsUnsafe();
      UserRecord u = requireUserUnsafe(readUsersUnsafe(), userId);
      long mine = apps.stream().filter(a -> a.ta_user_id == userId).count();
      long pending = apps.stream().filter(a -> a.ta_user_id == userId && "pending".equals(a.status)).count();
      long accepted = apps.stream().filter(a -> a.ta_user_id == userId && "accepted".equals(a.status)).count();
      long unread = notifs.stream().filter(n -> n.user_id == userId && !n.read).count();
      List<String> missing = computeMissingProfileFields(u);
      List<Map<String, Object>> recentNotifs = notifs.stream()
          .filter(n -> n.user_id == userId)
          .sorted(Comparator.comparing((NotificationRecord n) -> n.created_at).reversed())
          .limit(5)
          .map(TaRecruitService::notificationOut)
          .collect(Collectors.toList());
      List<Map<String, Object>> recJobs = jobs.stream()
          .filter(j -> isTaRecruitingSlot(j, apps) && !taDeadlineClosed(j))
          .sorted(Comparator.comparing((JobRecord j) -> j.created_at).reversed())
          .limit(5)
          .map(j -> jobOut(j, false, apps, true))
          .collect(Collectors.toList());
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("applications_total", mine);
      m.put("applications_pending", pending);
      m.put("applications_accepted", accepted);
      m.put("notifications_unread", unread);
      m.put("profile_completeness", profileCompletenessPct(u, missing));
      m.put("recent_notifications", recentNotifs);
      m.put("recommended_jobs", recJobs);
      Map<String, Object> insights = new LinkedHashMap<>();
      insights.put("missing_profile_fields", missing);
      insights.put("deadline_soon_count", countTaDeadlineSoonJobs(jobs, apps));
      insights.put("recommended_job_count", recJobs.size());
      m.put("insights", insights);
      return m;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> moDashboard(int userId) {
    rw.readLock().lock();
    try {
      UserRecord mo = requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<JobRecord> mine = jobs.stream().filter(j -> j.created_by == mo.id).toList();
      long openJobs = mine.stream().filter(j -> RECRUITING.contains(j.status)).count();
      long totalApps = apps.stream().filter(a -> mine.stream().anyMatch(j -> j.id == a.job_id)).count();
      long pendingApps = apps.stream()
          .filter(a -> "pending".equals(a.status))
          .filter(a -> mine.stream().anyMatch(j -> j.id == a.job_id))
          .count();
      double fillRate = mine.isEmpty() ? 0
          : 100.0 * mine.stream().filter(j -> "filled".equals(j.status)).count() / mine.size();
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("my_open_jobs", openJobs);
      m.put("total_applications", totalApps);
      m.put("pending_applications", pendingApps);
      m.put("fill_rate_pct", Math.round(fillRate * 10) / 10.0);
      m.put("recent_jobs", mine.stream()
          .sorted(Comparator.comparing((JobRecord j) -> j.created_at).reversed())
          .limit(5)
          .map(j -> jobOut(j, false, apps))
          .collect(Collectors.toList()));
      Map<String, Object> insights = new LinkedHashMap<>();
      long lowApplicants = mine.stream()
          .filter(j -> RECRUITING.contains(j.status))
          .filter(j -> apps.stream().filter(a -> a.job_id == j.id && !"withdrawn".equals(a.status)).count() < 2)
          .count();
      long deadlineSoon = mine.stream()
          .filter(j -> RECRUITING.contains(j.status))
          .filter(j -> deadlineEndInstant(j.deadline)
              .map(end -> !end.isBefore(Instant.now())
                  && !end.isAfter(Instant.now().plus(7, ChronoUnit.DAYS)))
              .orElse(false))
          .count();
      insights.put("jobs_low_applicants", lowApplicants);
      insights.put("jobs_deadline_soon", deadlineSoon);
      m.put("insights", insights);
      return m;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> adminDashboard(int userId) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "admin");
      List<UserRecord> users = readUsersUnsafe();
      List<AssignmentRecord> assigns = readAssignmentsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      List<JobRecord> allJobs = readJobsUnsafe();
      List<NotificationRecord> allNotifs = readNotificationsUnsafe();
      SettingsRecord st = readSettingsMergedUnsafe();
      long taCount = users.stream().filter(u -> "ta".equals(u.role)).count();
      double totalH = assigns.stream().mapToDouble(a -> a.assigned_hours).sum();
      List<Map<String, Object>> wl = adminWorkload(userId, null);
      long overload = wl.stream().filter(r -> Boolean.TRUE.equals(r.get("overloaded"))).count();
      List<Map<String, Object>> recent = logs.stream()
          .sorted(Comparator.comparing((ActivityLogRecord l) -> l.created_at).reversed())
          .limit(10)
          .map(TaRecruitService::activityOut)
          .collect(Collectors.toList());
      Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
      long notifWeek = allNotifs.stream()
          .filter(n -> n.created_at != null && !n.created_at.isBefore(weekAgo))
          .count();
      long stuckScreening = allJobs.stream()
          .filter(j -> "screening".equals(j.status))
          .filter(j -> j.updated_at != null && j.updated_at.isBefore(Instant.now().minus(14, ChronoUnit.DAYS)))
          .count();
      Map<String, Object> m = new LinkedHashMap<>();
      m.put("ta_count", taCount);
      m.put("total_assigned_hours", totalH);
      m.put("overloaded_ta_count", overload);
      m.put("recent_activity", recent);
      m.put("risk_alerts", overload > 0 ? List.of("Some TAs exceed overload threshold (" + st.overload_threshold_hours + "h)") : List.of());
      Map<String, Object> insights = new LinkedHashMap<>();
      insights.put("notifications_last_7d", notifWeek);
      insights.put("jobs_stuck_screening_14d", stuckScreening);
      m.put("insights", insights);
      return m;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> notificationsSummary(int userId) {
    rw.readLock().lock();
    try {
      requireUserUnsafe(readUsersUnsafe(), userId);
      List<NotificationRecord> list = readNotificationsUnsafe();
      long unread = list.stream().filter(n -> n.user_id == userId && !n.read).count();
      return Map.of("unread_count", unread);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Map<String, Object> moSaveEvaluation(int moUserId, int applicationId, Map<String, Object> body) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = readUsersUnsafe();
      UserRecord mo = requireRole(requireUserUnsafe(users, moUserId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      List<ApplicationEvaluationRecord> evals = readEvaluationsUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      ApplicationRecord app = apps.stream().filter(a -> a.id == applicationId).findFirst().orElseThrow(
          () -> new ApiException(404, "Application not found"));
      ensureOwnJob(jobs, app.job_id, mo.id);
      ApplicationEvaluationRecord ev = findEvaluation(evals, applicationId);
      if (ev == null) {
        ev = new ApplicationEvaluationRecord();
        ev.id = c.evaluationSeq++;
        ev.application_id = applicationId;
        ev.job_id = app.job_id;
        evals.add(ev);
      }
      if (body.containsKey("skill_match")) {
        ev.skill_match = clampScore(body.get("skill_match"));
      }
      if (body.containsKey("course_experience")) {
        ev.course_experience = clampScore(body.get("course_experience"));
      }
      if (body.containsKey("academic_background")) {
        ev.academic_background = clampScore(body.get("academic_background"));
      }
      if (body.containsKey("availability_score")) {
        ev.availability_score = clampScore(body.get("availability_score"));
      }
      if (body.containsKey("communication")) {
        ev.communication = clampScore(body.get("communication"));
      }
      if (body.containsKey("total_note") && body.get("total_note") != null) {
        ev.total_note = String.valueOf(body.get("total_note"));
      }
      if (body.containsKey("label") && body.get("label") != null) {
        ev.label = String.valueOf(body.get("label"));
      }
      if (body.containsKey("decision_note") && body.get("decision_note") != null) {
        ev.decision_note = String.valueOf(body.get("decision_note"));
      }
      ev.updated_by = mo.id;
      ev.updated_at = Instant.now();
      saveEvaluationsUnsafe(evals);
      logActivityUnsafe(logs, c, mo.id, "evaluation_saved", "application", applicationId, Map.of());
      saveAll(null, null, null, null, null, logs, c);
      return evaluationToMap(ev);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  private static int clampScore(Object o) {
    if (o instanceof Number n) {
      return Math.max(0, Math.min(5, n.intValue()));
    }
    return 0;
  }

  public Map<String, Object> taToggleFavorite(int userId, int jobId) {
    rw.writeLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "ta");
      List<JobFavoriteRecord> favs = readFavoritesUnsafe();
      boolean removed = favs.removeIf(f -> f.user_id == userId && f.job_id == jobId);
      if (!removed) {
        JobFavoriteRecord f = new JobFavoriteRecord();
        f.user_id = userId;
        f.job_id = jobId;
        favs.add(f);
      }
      saveFavoritesUnsafe(favs);
      return Map.of("favorited", !removed);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public Map<String, Object> taRegisterCv(
      int userId, String originalName, String contentType, long size, byte[] data) {
    rw.writeLock().lock();
    try {
      if (size > 5 * 1024 * 1024) {
        throw new ApiException(400, "File too large (max 5MB)");
      }
      String ct = contentType != null ? contentType.toLowerCase(Locale.ROOT) : "";
      if (!ct.contains("pdf") && !ct.contains("word") && !ct.contains("msword")
          && !ct.contains("officedocument") && !originalName.toLowerCase(Locale.ROOT).endsWith(".pdf")
          && !originalName.toLowerCase(Locale.ROOT).endsWith(".doc")
          && !originalName.toLowerCase(Locale.ROOT).endsWith(".docx")) {
        throw new ApiException(400, "Only pdf, doc, docx allowed");
      }
      List<UserRecord> users = readUsersUnsafe();
      UserRecord u = requireRole(requireUserUnsafe(users, userId), "ta");
      List<CvFileRecord> files = readCvFilesUnsafe();
      List<ActivityLogRecord> logs = readLogsUnsafe();
      Counters c = readCountersUnsafe();
      Files.createDirectories(cvPayloadsDir);
      CvFileRecord meta = new CvFileRecord();
      meta.id = c.cvFileSeq++;
      meta.user_id = userId;
      meta.stored_name = "cv_payloads/" + meta.id + ".txt";
      meta.original_name = originalName;
      meta.content_type = contentType != null ? contentType : "application/octet-stream";
      meta.size_bytes = size;
      meta.version = (int) files.stream().filter(f -> f.user_id == userId).count() + 1;
      meta.created_at = Instant.now();
      String b64 = Base64.getEncoder().encodeToString(data);
      Files.writeString(cvPayloadsDir.resolve(meta.id + ".txt"), b64, StandardCharsets.UTF_8);
      files.add(meta);
      u.cv_file_path = meta.stored_name;
      saveCvFilesUnsafe(files);
      logActivityUnsafe(logs, c, userId, "cv_uploaded", "user", userId, Map.of("file_id", meta.id));
      saveAll(users, null, null, null, null, logs, c);
      Map<String, Object> res = new LinkedHashMap<>();
      res.put("file_id", meta.id);
      res.put("stored_name", meta.stored_name);
      return res;
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  private byte[] readCvFileBytes(CvFileRecord f) throws IOException {
    if (f.stored_name != null && f.stored_name.startsWith("cv_payloads/")) {
      Path p = cvPayloadsDir.resolve(f.stored_name.substring("cv_payloads/".length()));
      if (!Files.exists(p)) {
        throw new ApiException(404, "File not found");
      }
      String b64 = Files.readString(p, StandardCharsets.UTF_8).trim();
      return Base64.getDecoder().decode(b64);
    }
    Path legacy = uploadsDir.resolve(f.stored_name);
    if (!Files.exists(legacy)) {
      throw new ApiException(404, "File not found");
    }
    return Files.readAllBytes(legacy);
  }

  public byte[] taDownloadCv(int userId, int fileId) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "ta");
      List<CvFileRecord> files = readCvFilesUnsafe();
      CvFileRecord f = files.stream().filter(x -> x.id == fileId && x.user_id == userId).findFirst()
          .orElseThrow(() -> new ApiException(404, "File not found"));
      return readCvFileBytes(f);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public byte[] moDownloadApplicantCv(int moUserId, int applicationId) {
    rw.readLock().lock();
    try {
      UserRecord mo = requireRole(requireUserUnsafe(readUsersUnsafe(), moUserId), "mo");
      List<JobRecord> jobs = readJobsUnsafe();
      List<ApplicationRecord> apps = readApplicationsUnsafe();
      ApplicationRecord app = apps.stream().filter(a -> a.id == applicationId).findFirst().orElseThrow(
          () -> new ApiException(404, "Application not found"));
      ensureOwnJob(jobs, app.job_id, mo.id);
      CvFileRecord f = latestCvForApplicant(readCvFilesUnsafe(), app.ta_user_id);
      if (f == null) {
        throw new ApiException(404, "No CV on file for this applicant");
      }
      return readCvFileBytes(f);
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public List<Map<String, Object>> adminActivityLogs(
      int userId, int skip, int limit, Integer actorUserId, String action, String fromIso, String toIso,
      String entityType) {
    rw.readLock().lock();
    try {
      requireRole(requireUserUnsafe(readUsersUnsafe(), userId), "admin");
      List<ActivityLogRecord> logs = readLogsUnsafe();
      logs = new ArrayList<>(logs);
      Instant from = parseIso(fromIso);
      Instant to = parseIso(toIso);
      final String et = entityType != null ? entityType.strip() : "";
      logs = logs.stream()
          .filter(l -> actorUserId == null || (l.actor_user_id != null && l.actor_user_id.equals(actorUserId)))
          .filter(l -> action == null || action.isBlank() || action.equalsIgnoreCase(l.action))
          .filter(l -> et.isEmpty() || (l.entity_type != null && l.entity_type.equalsIgnoreCase(et)))
          .filter(l -> from == null || (l.created_at != null && !l.created_at.isBefore(from)))
          .filter(l -> to == null || (l.created_at != null && !l.created_at.isAfter(to)))
          .sorted(Comparator.comparing((ActivityLogRecord l) -> l.created_at).reversed())
          .collect(Collectors.toList());
      int fromIdx = Math.min(skip, logs.size());
      int toIdx = Math.min(fromIdx + limit, logs.size());
      return logs.subList(fromIdx, toIdx).stream().map(TaRecruitService::activityOut).collect(Collectors.toList());
    } catch (IOException e) {
      throw new RuntimeException(e);
    } finally {
      rw.readLock().unlock();
    }
  }

  private static Instant parseIso(String s) {
    if (s == null || s.isBlank()) {
      return null;
    }
    try {
      return Instant.parse(s);
    } catch (Exception e) {
      return null;
    }
  }

  public String adminActivityLogsExportCsv(
      int userId, Integer actorUserId, String action, String fromIso, String toIso, String entityType) {
    List<Map<String, Object>> rows =
        adminActivityLogs(userId, 0, 10_000, actorUserId, action, fromIso, toIso, entityType);
    StringBuilder sb = new StringBuilder();
    sb.append("id,actor_user_id,action,entity_type,entity_id,created_at\n");
    for (Map<String, Object> r : rows) {
      sb.append(r.get("id")).append(',');
      sb.append(r.get("actor_user_id")).append(',');
      sb.append(csv(String.valueOf(r.get("action")))).append(',');
      sb.append(csv(String.valueOf(r.get("entity_type")))).append(',');
      sb.append(r.get("entity_id")).append(',');
      sb.append(csv(String.valueOf(r.get("created_at")))).append('\n');
    }
    return sb.toString();
  }

  private static String csv(String s) {
    if (s == null) {
      return "";
    }
    if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
      return "\"" + s.replace("\"", "\"\"") + "\"";
    }
    return s;
  }

  private static Map<String, Object> activityOut(ActivityLogRecord x) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", x.id);
    m.put("actor_user_id", x.actor_user_id);
    m.put("action", x.action);
    m.put("entity_type", x.entity_type);
    m.put("entity_id", x.entity_id);
    m.put("payload", x.payload);
    m.put("created_at", x.created_at);
    return m;
  }

  private static Map<String, Object> notificationOut(NotificationRecord n) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", n.id);
    m.put("title", n.title);
    m.put("body", n.body);
    m.put("application_id", n.application_id);
    m.put("read", n.read);
    m.put("created_at", n.created_at);
    m.put("category", n.category != null ? n.category : "system");
    m.put("link_job_id", n.link_job_id);
    m.put("link_application_id", n.link_application_id);
    return m;
  }

  private static CvFileRecord latestCvForApplicant(List<CvFileRecord> files, int taUserId) {
    if (files == null || files.isEmpty()) {
      return null;
    }
    return files.stream()
        .filter(f -> f.user_id == taUserId)
        .max(Comparator.comparing(f -> f.created_at != null ? f.created_at : Instant.EPOCH))
        .orElse(null);
  }

  private static Map<String, Object> applicationOut(
      List<ApplicationRecord> allApps, List<JobRecord> jobs, List<UserRecord> users, ApplicationRecord a,
      List<ApplicationEvaluationRecord> evals, List<CvFileRecord> cvFiles, boolean taJobView) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", a.id);
    m.put("job_id", a.job_id);
    m.put("ta_user_id", a.ta_user_id);
    m.put("status", a.status);
    m.put("created_at", a.created_at);
    m.put("decided_at", a.decided_at);
    m.put("shortlist_tag", a.shortlist_tag != null ? a.shortlist_tag : "");
    JobRecord job = jobs.stream().filter(j -> j.id == a.job_id).findFirst().orElse(null);
    m.put("job", job != null ? jobOut(job, false, allApps, taJobView) : null);
    UserRecord ta = users.stream().filter(u -> u.id == a.ta_user_id).findFirst().orElse(null);
    m.put("ta_display_name", ta != null ? ta.display_name : null);
    m.put("ta_email", ta != null ? ta.email : null);
    m.put("ta_student_id", ta != null ? ta.student_id : null);
    CvFileRecord cv = latestCvForApplicant(cvFiles, a.ta_user_id);
    if (cv != null) {
      m.put("ta_cv_file_id", cv.id);
      m.put("ta_cv_original_name", cv.original_name != null ? cv.original_name : "");
    }
    ApplicationEvaluationRecord ev = findEvaluation(evals, a.id);
    m.put("evaluation", evaluationToMap(ev));
    m.put("evaluation_total", ev != null ? scoreSum(ev) : 0);
    return m;
  }

  private static Map<String, Object> jobOut(JobRecord j, boolean favorited, List<ApplicationRecord> apps) {
    return jobOut(j, favorited, apps, false);
  }

  private static Map<String, Object> jobOut(
      JobRecord j, boolean favorited, List<ApplicationRecord> apps, boolean taView) {
    normalizeJob(j);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", j.id);
    m.put("module_name", j.module_name);
    m.put("requirements", j.requirements);
    m.put("deadline", j.deadline);
    m.put("skill_tags", j.skill_tags);
    m.put("status", taView && taDeadlineClosed(j) ? "closed" : j.status);
    m.put("assigned_hours", j.assigned_hours);
    m.put("created_by", j.created_by);
    m.put("created_at", j.created_at);
    m.put("updated_at", j.updated_at);
    m.put("quota", j.quota);
    m.put("accepted_count", acceptedCount(apps, j.id));
    m.put("job_type", j.job_type);
    m.put("term", j.term);
    m.put("schedule_text", j.schedule_text);
    m.put("allow_duplicate_apply_same_type", j.allow_duplicate_apply_same_type);
    m.put("favorited", favorited);
    return m;
  }

  private static Map<String, Object> userOut(UserRecord u) {
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", u.id);
    m.put("email", u.email);
    m.put("role", u.role);
    m.put("display_name", u.display_name);
    m.put("student_id", u.student_id);
    m.put("skills", u.skills);
    m.put("cv_file_path", u.cv_file_path);
    m.put("created_at", u.created_at);
    m.put("profile_skills", u.profile_skills != null ? u.profile_skills : List.of());
    m.put("preferred_courses", u.preferred_courses != null ? u.preferred_courses : "");
    m.put("languages", u.languages != null ? u.languages : "");
    m.put("availability_json", u.availability_json != null ? u.availability_json : "");
    m.put("max_weekly_hours", u.max_weekly_hours);
    m.put("ta_history", u.ta_history != null ? u.ta_history : "");
    m.put("certificates", u.certificates != null ? u.certificates : "");
    m.put("gpa", u.gpa != null ? u.gpa : "");
    if ("ta".equals(u.role)) {
      List<String> missing = computeMissingProfileFields(u);
      m.put("profile_completeness", profileCompletenessPct(u, missing));
      m.put("missing_profile_fields", missing);
    }
    return m;
  }

  private static ApiException mapUserServiceToApi(IllegalArgumentException ex) {
    String msg = ex.getMessage() != null ? ex.getMessage() : "Bad request";
    if (msg.contains("password") || msg.contains("chars") || msg.contains("digits")) {
      return new ApiException(422, msg);
    }
    return new ApiException(400, msg);
  }

  private static void validatePasswordStrength(String password) {
    if (password.length() < 8) {
      throw new ApiException(422, "password: at least 8 characters");
    }
    boolean letter = password.chars().anyMatch(Character::isLetter);
    boolean digit = password.chars().anyMatch(Character::isDigit);
    if (!letter || !digit) {
      throw new ApiException(422, "password: must contain both letters and digits");
    }
  }

  private static void normalizeJob(JobRecord j) {
    if (j.status == null || j.status.isBlank()) {
      j.status = "open";
    }
    if (j.quota <= 0) {
      j.quota = 1;
    }
    if (j.job_type == null || j.job_type.isBlank()) {
      j.job_type = "course_ta";
    }
    if (j.term == null) {
      j.term = "";
    }
    if (j.schedule_text == null) {
      j.schedule_text = "";
    }
  }

  private static int acceptedCount(List<ApplicationRecord> apps, int jobId) {
    return (int) apps.stream()
        .filter(a -> a.job_id == jobId && "accepted".equals(a.status))
        .count();
  }

  private static boolean isTaRecruitingSlot(JobRecord j, List<ApplicationRecord> apps) {
    normalizeJob(j);
    return RECRUITING.contains(j.status) && acceptedCount(apps, j.id) < j.quota;
  }

  /** Workload checker: sum TA weekly hours from active applications by traversing JSON records. */
  private static Map<Integer, Double> computeTaAppliedWeeklyHours(
      List<ApplicationRecord> apps, List<JobRecord> jobs) {
    Map<Integer, JobRecord> jobIndex = jobs.stream()
        .collect(Collectors.toMap(j -> j.id, j -> j, (a, b) -> a, LinkedHashMap::new));
    Map<Integer, Double> totals = new LinkedHashMap<>();
    for (ApplicationRecord a : apps) {
      if (!"pending".equals(a.status) && !"interviewing".equals(a.status) && !"accepted".equals(a.status)) {
        continue;
      }
      JobRecord job = jobIndex.get(a.job_id);
      if (job == null) {
        continue;
      }
      normalizeJob(job);
      totals.merge(a.ta_user_id, job.assigned_hours, Double::sum);
    }
    return totals;
  }

  /** TA-facing: deadline passed while job is still in a recruiting state (JSON may still say open, etc.). */
  private static boolean taDeadlineClosed(JobRecord j) {
    normalizeJob(j);
    if (!RECRUITING.contains(j.status)) {
      return false;
    }
    Optional<Instant> end = deadlineEndInstant(j.deadline);
    return end.isPresent() && Instant.now().isAfter(end.get());
  }

  private static Comparator<JobRecord> jobComparator(String sortParam) {
    if (sortParam == null || sortParam.isBlank()) {
      return Comparator.comparing((JobRecord j) -> j.created_at).reversed();
    }
    return switch (sortParam.toLowerCase(Locale.ROOT)) {
      case "deadline" -> Comparator.comparing(
          (JobRecord j) -> j.deadline != null ? j.deadline : "", String.CASE_INSENSITIVE_ORDER);
      case "hours", "assigned_hours" -> Comparator.comparing((JobRecord j) -> j.assigned_hours);
      case "quota" -> Comparator.comparing((JobRecord j) -> j.quota);
      default -> Comparator.comparing((JobRecord j) -> j.created_at).reversed();
    };
  }

  private JobTemplatesFile readJobTemplatesFile() throws IOException {
    if (!java.nio.file.Files.exists(jobTemplatesPath)) {
      AtomicJsonFile.writeAtomic(jobTemplatesPath, JobTemplatesFile.defaults());
    }
    return AtomicJsonFile.readObject(jobTemplatesPath, JobTemplatesFile.class, JobTemplatesFile.defaults());
  }

  private void mergeJobTemplateIntoCreateBody(int moUserId, Map<String, Object> body) throws IOException {
    Object tid = body.get("template_id");
    if (tid == null) {
      return;
    }
    String id = String.valueOf(tid).trim();
    if (id.isEmpty()) {
      return;
    }
    JobTemplatesFile tf = readJobTemplatesFile();
    Map<String, Object> src = null;
    for (Map<String, Object> b : tf.built_ins) {
      if (id.equals(String.valueOf(b.get("id")))) {
        src = b;
        break;
      }
    }
    if (src == null) {
      for (Map<String, Object> s : tf.saved) {
        Object mo = s.get("mo_user_id");
        if (mo instanceof Number n && n.intValue() == moUserId && id.equals(String.valueOf(s.get("saved_id")))) {
          src = s;
          break;
        }
      }
    }
    if (src == null) {
      throw new ApiException(400, "Unknown template_id: " + id);
    }
    LinkedHashMap<String, Object> merged = new LinkedHashMap<>();
    for (Map.Entry<String, Object> e : src.entrySet()) {
      String k = e.getKey();
      if ("id".equals(k) || "saved_id".equals(k) || "mo_user_id".equals(k) || "name".equals(k) || "built_in".equals(k)) {
        continue;
      }
      merged.put(k, e.getValue());
    }
    merged.putAll(body);
    body.clear();
    body.putAll(merged);
  }

  private static Optional<Instant> deadlineEndInstant(String deadline) {
    if (deadline == null || deadline.isBlank()) {
      return Optional.empty();
    }
    String d = deadline.trim();
    try {
      return Optional.of(Instant.parse(d));
    } catch (Exception ignored) {
      // try date-only
    }
    try {
      LocalDate ld = LocalDate.parse(d);
      return Optional.of(ld.atTime(23, 59, 59).toInstant(ZoneOffset.UTC));
    } catch (Exception ignored) {
      return Optional.empty();
    }
  }

  private static long countTaDeadlineSoonJobs(List<JobRecord> jobs, List<ApplicationRecord> apps) {
    Instant now = Instant.now();
    Instant week = now.plus(7, ChronoUnit.DAYS);
    return jobs.stream()
        .filter(j -> isTaRecruitingSlot(j, apps))
        .filter(j -> deadlineEndInstant(j.deadline)
            .map(end -> !end.isBefore(now) && !end.isAfter(week))
            .orElse(false))
        .count();
  }

  private static boolean isAllowedJobTransition(String from, String to) {
    if (from == null || to == null) {
      return false;
    }
    return switch (from) {
      case "draft" -> Set.of("open", "cancelled").contains(to);
      case "open" -> Set.of("screening", "closed", "cancelled").contains(to);
      case "screening" -> Set.of("interview", "closed", "cancelled").contains(to);
      case "interview" -> Set.of("shortlist", "closed", "cancelled").contains(to);
      case "shortlist" -> Set.of("filled", "closed", "cancelled", "open").contains(to);
      case "filled" -> Set.of("closed").contains(to);
      case "closed", "cancelled" -> false;
      default -> false;
    };
  }

  /**
   * Application status machine:
   * pending(已申请) -> interviewing(面试中) -> accepted/rejected
   * pending can also go directly to rejected; rejected/accepted/withdrawn are terminal.
   */
  private static boolean isAllowedApplicationTransition(String from, String to) {
    if (from == null || to == null) {
      return false;
    }
    return switch (from) {
      case "pending" -> Set.of("interviewing", "rejected").contains(to);
      case "interviewing" -> Set.of("accepted", "rejected").contains(to);
      case "accepted", "rejected", "withdrawn" -> false;
      default -> false;
    };
  }

  private static ApplicationEvaluationRecord findEvaluation(
      List<ApplicationEvaluationRecord> evals, int applicationId) {
    if (evals == null) {
      return null;
    }
    return evals.stream().filter(e -> e.application_id == applicationId).findFirst().orElse(null);
  }

  private static int evaluationTotal(List<ApplicationEvaluationRecord> evals, int applicationId) {
    ApplicationEvaluationRecord e = findEvaluation(evals, applicationId);
    return e != null ? scoreSum(e) : 0;
  }

  private static int evaluationSkill(List<ApplicationEvaluationRecord> evals, int applicationId) {
    ApplicationEvaluationRecord e = findEvaluation(evals, applicationId);
    return e != null ? e.skill_match : 0;
  }

  private static int scoreSum(ApplicationEvaluationRecord e) {
    return e.skill_match + e.course_experience + e.academic_background + e.availability_score
        + e.communication;
  }

  private static Map<String, Object> evaluationToMap(ApplicationEvaluationRecord e) {
    if (e == null) {
      return null;
    }
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("id", e.id);
    m.put("application_id", e.application_id);
    m.put("skill_match", e.skill_match);
    m.put("course_experience", e.course_experience);
    m.put("academic_background", e.academic_background);
    m.put("availability_score", e.availability_score);
    m.put("communication", e.communication);
    m.put("total_note", e.total_note);
    m.put("label", e.label);
    m.put("decision_note", e.decision_note);
    m.put("updated_by", e.updated_by);
    m.put("updated_at", e.updated_at);
    m.put("total_score", scoreSum(e));
    return m;
  }

  private static List<String> computeMissingProfileFields(UserRecord u) {
    List<String> m = new ArrayList<>();
    if (u.profile_skills == null || u.profile_skills.isEmpty()) {
      m.add("profile_skills");
    }
    if (u.preferred_courses == null || u.preferred_courses.isBlank()) {
      m.add("preferred_courses");
    }
    if (u.availability_json == null || u.availability_json.isBlank()) {
      m.add("availability_json");
    }
    if (u.max_weekly_hours <= 0) {
      m.add("max_weekly_hours");
    }
    if (u.skills == null || u.skills.isBlank()) {
      m.add("skills");
    }
    return m;
  }

  private static int profileCompletenessPct(UserRecord u, List<String> missing) {
    int total = 6;
    return (int) Math.round(100.0 * (total - missing.size()) / total);
  }

  private List<String> computeAssignmentWarnings(
      List<UserRecord> users, List<AssignmentRecord> assigns, List<JobRecord> jobs,
      JobRecord job, int taUserId, SettingsRecord settings) {
    List<String> w = new ArrayList<>();
    UserRecord ta = users.stream().filter(u -> u.id == taUserId).findFirst().orElse(null);
    double cap = settings.overload_threshold_hours > 0 ? settings.overload_threshold_hours : maxTaHoursDefault;
    double total = assigns.stream()
        .filter(a -> a.ta_user_id == taUserId)
        .mapToDouble(a -> a.assigned_hours)
        .sum();
    if (total + job.assigned_hours > cap) {
      w.add("Overloaded: total assigned hours would exceed threshold (" + cap + "h)");
    }
    if (ta != null && ta.max_weekly_hours > 0 && job.assigned_hours > ta.max_weekly_hours) {
      w.add("ScheduleConflict: job hours exceed TA declared max weekly hours");
    }
    if (w.isEmpty()) {
      w.add("SafeToAssign");
    }
    return w;
  }

  @SuppressWarnings("unchecked")
  private void patchProfileStructured(UserRecord user, Map<String, Object> body) {
    if (body.containsKey("profile_skills") && body.get("profile_skills") instanceof List) {
      List<Object> raw = (List<Object>) body.get("profile_skills");
      user.profile_skills = new ArrayList<>();
      for (Object o : raw) {
        user.profile_skills.add(String.valueOf(o));
      }
    }
    if (body.containsKey("preferred_courses") && body.get("preferred_courses") != null) {
      user.preferred_courses = String.valueOf(body.get("preferred_courses"));
    }
    if (body.containsKey("languages") && body.get("languages") != null) {
      user.languages = String.valueOf(body.get("languages"));
    }
    if (body.containsKey("availability_json") && body.get("availability_json") != null) {
      user.availability_json = String.valueOf(body.get("availability_json"));
    }
    if (body.containsKey("max_weekly_hours") && body.get("max_weekly_hours") != null) {
      user.max_weekly_hours = asDouble(body.get("max_weekly_hours"), user.max_weekly_hours);
    }
    if (body.containsKey("ta_history") && body.get("ta_history") != null) {
      user.ta_history = String.valueOf(body.get("ta_history"));
    }
    if (body.containsKey("certificates") && body.get("certificates") != null) {
      user.certificates = String.valueOf(body.get("certificates"));
    }
    if (body.containsKey("gpa") && body.get("gpa") != null) {
      user.gpa = String.valueOf(body.get("gpa"));
    }
  }

  private static JobRecord ensureOwnJob(List<JobRecord> jobs, int jobId, int moId) {
    JobRecord job = jobs.stream().filter(j -> j.id == jobId).findFirst().orElseThrow(
        () -> new ApiException(404, "Job not found"));
    if (job.created_by != moId) {
      throw new ApiException(403, "Not your job");
    }
    return job;
  }

  private static UserRecord requireUserUnsafe(List<UserRecord> users, int userId) {
    return users.stream().filter(u -> u.id == userId).findFirst().orElseThrow(
        () -> new ApiException(401, "User not found"));
  }

  private static UserRecord requireRole(UserRecord u, String role) {
    if (!role.equals(u.role)) {
      throw new ApiException(403, "Forbidden");
    }
    return u;
  }

  private void logActivityUnsafe(
      List<ActivityLogRecord> logs, Counters c, Integer actor, String action,
      String entityType, Integer entityId, Map<String, Object> payload) {
    ActivityLogRecord row = new ActivityLogRecord();
    row.id = c.activityLogSeq++;
    row.actor_user_id = actor;
    row.action = action;
    row.entity_type = entityType != null ? entityType : "";
    row.entity_id = entityId;
    row.payload = payload;
    row.created_at = Instant.now();
    logs.add(row);
  }

  private void saveAll(
      List<UserRecord> users, List<JobRecord> jobs, List<ApplicationRecord> apps,
      List<NotificationRecord> notifs, List<AssignmentRecord> assigns,
      List<ActivityLogRecord> logs, Counters c) throws IOException {
    if (users != null) {
      AtomicJsonFile.writeAtomic(usersPath, users);
    }
    if (jobs != null) {
      AtomicJsonFile.writeAtomic(jobsPath, jobs);
    }
    if (apps != null) {
      AtomicJsonFile.writeAtomic(applicationsPath, apps);
    }
    if (notifs != null) {
      AtomicJsonFile.writeAtomic(notificationsPath, notifs);
    }
    if (assigns != null) {
      AtomicJsonFile.writeAtomic(assignmentsPath, assigns);
    }
    if (logs != null) {
      AtomicJsonFile.writeAtomic(activityLogsPath, logs);
    }
    AtomicJsonFile.writeAtomic(countersPath, c);
  }

  private void saveNotifications(List<NotificationRecord> list) throws IOException {
    AtomicJsonFile.writeAtomic(notificationsPath, list);
    Counters c = readCountersUnsafe();
    AtomicJsonFile.writeAtomic(countersPath, c);
  }

  private List<UserRecord> readUsersUnsafe() throws IOException {
    return new ArrayList<>(AtomicJsonFile.readList(usersPath, new TypeReference<List<UserRecord>>() {},
        List.of()));
  }

  private List<JobRecord> readJobsUnsafe() throws IOException {
    List<JobRecord> jobs = new ArrayList<>(AtomicJsonFile.readList(jobsPath, new TypeReference<List<JobRecord>>() {},
        List.of()));
    for (JobRecord j : jobs) {
      normalizeJob(j);
    }
    return jobs;
  }

  private List<ApplicationRecord> readApplicationsUnsafe() throws IOException {
    List<ApplicationRecord> apps = new ArrayList<>(AtomicJsonFile.readList(applicationsPath,
        new TypeReference<List<ApplicationRecord>>() {}, List.of()));
    for (ApplicationRecord a : apps) {
      if (a.shortlist_tag == null) {
        a.shortlist_tag = "";
      }
    }
    return apps;
  }

  private List<ApplicationEvaluationRecord> readEvaluationsUnsafe() throws IOException {
    return new ArrayList<>(AtomicJsonFile.readList(evaluationsPath,
        new TypeReference<List<ApplicationEvaluationRecord>>() {}, List.of()));
  }

  private void saveEvaluationsUnsafe(List<ApplicationEvaluationRecord> list) throws IOException {
    AtomicJsonFile.writeAtomic(evaluationsPath, list);
  }

  private List<JobFavoriteRecord> readFavoritesUnsafe() throws IOException {
    return new ArrayList<>(AtomicJsonFile.readList(favoritesPath,
        new TypeReference<List<JobFavoriteRecord>>() {}, List.of()));
  }

  private void saveFavoritesUnsafe(List<JobFavoriteRecord> list) throws IOException {
    AtomicJsonFile.writeAtomic(favoritesPath, list);
  }

  private SettingsRecord readSettingsMergedUnsafe() throws IOException {
    SettingsRecord f = AtomicJsonFile.readObject(settingsPath, SettingsRecord.class, new SettingsRecord());
    if (f.max_ta_hours_default <= 0) {
      f.max_ta_hours_default = maxTaHoursDefault;
    }
    if (f.overload_threshold_hours <= 0) {
      f.overload_threshold_hours = f.max_ta_hours_default;
    }
    if (f.default_job_quota <= 0) {
      f.default_job_quota = 1;
    }
    if (f.semester_label == null) {
      f.semester_label = "";
    }
    return f;
  }

  private void saveSettingsUnsafe(SettingsRecord s) throws IOException {
    AtomicJsonFile.writeAtomic(settingsPath, s);
  }

  private List<CvFileRecord> readCvFilesUnsafe() throws IOException {
    return new ArrayList<>(AtomicJsonFile.readList(cvFilesPath, new TypeReference<List<CvFileRecord>>() {},
        List.of()));
  }

  private void saveCvFilesUnsafe(List<CvFileRecord> list) throws IOException {
    AtomicJsonFile.writeAtomic(cvFilesPath, list);
  }

  private List<NotificationRecord> readNotificationsUnsafe() throws IOException {
    return new ArrayList<>(AtomicJsonFile.readList(notificationsPath,
        new TypeReference<List<NotificationRecord>>() {}, List.of()));
  }

  private List<AssignmentRecord> readAssignmentsUnsafe() throws IOException {
    return new ArrayList<>(AtomicJsonFile.readList(assignmentsPath,
        new TypeReference<List<AssignmentRecord>>() {}, List.of()));
  }

  private List<ActivityLogRecord> readLogsUnsafe() throws IOException {
    return new ArrayList<>(AtomicJsonFile.readList(activityLogsPath,
        new TypeReference<List<ActivityLogRecord>>() {}, List.of()));
  }

  private Counters readCountersUnsafe() throws IOException {
    Counters c = AtomicJsonFile.readObject(countersPath, Counters.class, new Counters());
    return c;
  }

  private static String requireStr(Object o, String field) {
    if (o == null) {
      throw new ApiException(422, field + " required");
    }
    String s = String.valueOf(o).trim();
    if (s.isEmpty()) {
      throw new ApiException(422, field + " required");
    }
    return s;
  }

  private static String optStr(Object o) {
    return o == null ? null : String.valueOf(o);
  }

  private static double asDouble(Object o, double def) {
    if (o == null) {
      return def;
    }
    if (o instanceof Number n) {
      return n.doubleValue();
    }
    return Double.parseDouble(o.toString());
  }
}
