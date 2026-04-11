package com.ebu6304.tarecruit;

import com.ebu6304.tarecruit.api.ApiException;
import com.ebu6304.tarecruit.auth.JwtHelper;
import com.ebu6304.tarecruit.auth.Passwords;
import com.ebu6304.tarecruit.domain.ActivityLogRecord;
import com.ebu6304.tarecruit.domain.ApplicationEvaluationRecord;
import com.ebu6304.tarecruit.domain.ApplicationRecord;
import com.ebu6304.tarecruit.domain.AssignmentRecord;
import com.ebu6304.tarecruit.domain.Counters;
import com.ebu6304.tarecruit.domain.JobFavoriteRecord;
import com.ebu6304.tarecruit.domain.JobRecord;
import com.ebu6304.tarecruit.domain.NotificationRecord;
import com.ebu6304.tarecruit.domain.UserRecord;
import com.ebu6304.tarecruit.store.AtomicJsonFile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TaRecruitServiceCoreTest {

  @TempDir
  Path dataDir;

  private TaRecruitService svc;
  private JwtHelper jwt;

  @BeforeEach
  void setUp() throws Exception {
    jwt = new JwtHelper("01234567890123456789012345678901", 1440);
    svc = new TaRecruitService(dataDir, jwt, 20.0);
    svc.initEmptyFiles();
    seedUsers();
  }

  private void seedUsers() throws Exception {
    List<UserRecord> users = new ArrayList<>();
    Counters c = new Counters();
    c.userSeq = 4;
    c.jobSeq = 1;
    c.applicationSeq = 1;
    c.notificationSeq = 1;
    c.activityLogSeq = 1;
    c.evaluationSeq = 1;
    c.assignmentSeq = 1;
    c.cvFileSeq = 1;

    UserRecord admin = new UserRecord();
    admin.id = 1;
    admin.email = "admin@test.edu";
    admin.password_hash = Passwords.hash("Admin12345");
    admin.role = "admin";
    admin.display_name = "Admin";
    admin.created_at = Instant.now();
    users.add(admin);

    UserRecord mo = new UserRecord();
    mo.id = 2;
    mo.email = "mo@test.edu";
    mo.password_hash = Passwords.hash("Mo123456");
    mo.role = "mo";
    mo.display_name = "MO";
    mo.created_at = Instant.now();
    users.add(mo);

    UserRecord ta = new UserRecord();
    ta.id = 3;
    ta.email = "ta@test.edu";
    ta.password_hash = Passwords.hash("Ta123456");
    ta.role = "ta";
    ta.display_name = "TA";
    ta.student_id = "2025001";
    ta.skills = "python, java";
    ta.created_at = Instant.now();
    users.add(ta);

    AtomicJsonFile.writeAtomic(dataDir.resolve("users.json"), users);
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);
  }

  @Test
  void healthIncludesStatusVersionAndDataDir() {
    Map<String, String> h = svc.health();
    assertEquals("ok", h.get("status"));
    assertEquals("1.0.0", h.get("version"));
    assertTrue(h.containsKey("time"));
    assertTrue(h.containsKey("java"));
    assertEquals(dataDir.toAbsolutePath().normalize().toString(), h.get("data_dir"));
  }

  @Test
  void registerRejectsNonTaRole() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "x@y.z");
    body.put("password", "Abcd1234");
    body.put("student_id", "2025999");
    body.put("role", "admin");
    ApiException ex = assertThrows(ApiException.class, () -> svc.register(body));
    assertEquals(422, ex.status);
  }

  @Test
  void taRegisterSucceeds() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "newta@test.edu");
    body.put("password", "Abcd1234");
    body.put("student_id", "2025888");
    body.put("role", "TA");
    Map<String, Object> tok = assertDoesNotThrow(() -> svc.register(body));
    assertTrue(tok.containsKey("access_token"));
  }

  @Test
  void moRegisterSucceedsAndStoresRoleWithHashedPassword() throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "newmo@test.edu");
    body.put("password", "Abcd1234");
    body.put("display_name", "New MO");
    body.put("student_id", "MO-1001");
    body.put("role", "MO");
    Map<String, Object> tok = assertDoesNotThrow(() -> svc.register(body));
    assertTrue(tok.containsKey("access_token"));

    List<UserRecord> users = AtomicJsonFile.readList(
        dataDir.resolve("users.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<UserRecord>>() {},
        new ArrayList<>());
    UserRecord mo = users.stream().filter(u -> "newmo@test.edu".equalsIgnoreCase(u.email)).findFirst().orElseThrow();
    assertEquals("mo", mo.role);
    assertEquals("MO-1001", mo.student_id);
    assertTrue(mo.password_hash != null && !mo.password_hash.equals("Abcd1234"));
    assertTrue(Passwords.verify("Abcd1234", mo.password_hash));
  }

  @Test
  void adminCreateMoWritesRegisterLogWithStaffAndAdminId() throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "adminmade_mo@test.edu");
    body.put("password", "Abcd1234");
    body.put("display_name", "Admin Made MO");
    body.put("role", "mo");
    body.put("student_id", "MO-ADMIN-1");
    assertDoesNotThrow(() -> svc.adminCreateUser(1, body));

    List<ActivityLogRecord> logs = AtomicJsonFile.readList(
        dataDir.resolve("activity_logs.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<ActivityLogRecord>>() {},
        new ArrayList<>());
    ActivityLogRecord reg = logs.stream()
        .filter(l -> "register".equals(l.action)
            && l.payload != null
            && l.payload.get("created_by_admin_id") != null)
        .reduce((a, b) -> b)
        .orElseThrow();
    assertEquals("user", reg.entity_type);
    assertEquals(4, reg.entity_id.intValue());
    assertEquals(4, reg.actor_user_id.intValue());
    assertEquals("adminmade_mo@test.edu", reg.payload.get("email"));
    assertEquals("mo", reg.payload.get("role"));
    assertEquals("MO-ADMIN-1", reg.payload.get("student_id"));
    assertEquals(1, ((Number) reg.payload.get("created_by_admin_id")).intValue());
  }

  @Test
  void adminCreateMoRejectsMissingStaffId() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "nomo@test.edu");
    body.put("password", "Abcd1234");
    body.put("role", "mo");
    ApiException ex = assertThrows(ApiException.class, () -> svc.adminCreateUser(1, body));
    assertEquals(400, ex.status);
  }

  @Test
  void publicRegisterCreatesAdminNotification() throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "regta@test.edu");
    body.put("password", "Abcd1234");
    body.put("student_id", "2025999");
    body.put("role", "TA");
    svc.register(body);

    List<NotificationRecord> notifs = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    assertEquals(1, notifs.size());
    assertEquals(1, notifs.get(0).user_id);
    assertFalse(notifs.get(0).read);
    assertTrue(notifs.get(0).title.contains("新用户注册"));
    assertTrue(notifs.get(0).body.contains("regta@test.edu"));
  }

  @Test
  void adminCreateUserDoesNotCreateAdminRegistrationNotification() throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "adminmade_only@test.edu");
    body.put("password", "Abcd1234");
    body.put("display_name", "Only Admin");
    body.put("role", "mo");
    body.put("student_id", "MO-X");
    svc.adminCreateUser(1, body);

    List<NotificationRecord> notifs = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    assertTrue(notifs.isEmpty());
  }

  @Test
  void taDeleteOwnAccountNotifiesAdmin() throws Exception {
    assertDoesNotThrow(() -> svc.deleteOwnAccount(3, Map.of("password", "Ta123456")));

    List<UserRecord> users = AtomicJsonFile.readList(
        dataDir.resolve("users.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<UserRecord>>() {},
        new ArrayList<>());
    assertTrue(users.stream().noneMatch(u -> u.id == 3));

    List<NotificationRecord> notifs = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    NotificationRecord toAdmin = notifs.stream().filter(n -> n.user_id == 1).findFirst().orElseThrow();
    assertTrue(toAdmin.title.contains("注销"));
    assertTrue(toAdmin.body.contains("ta@test.edu"));
  }

  @Test
  void taDeleteOwnAccountWrongPassword() {
    ApiException ex = assertThrows(ApiException.class, () -> svc.deleteOwnAccount(3, Map.of("password", "nope")));
    assertEquals(400, ex.status);
  }

  @Test
  void adminCannotSelfDeleteAccount() {
    ApiException ex = assertThrows(ApiException.class, () -> svc.deleteOwnAccount(1, Map.of("password", "Admin12345")));
    assertEquals(403, ex.status);
  }

  @Test
  void moWithCreatedJobCannotDeleteAccount() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "Owned";
    j.status = "open";
    j.created_by = 2;
    j.quota = 1;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    ApiException ex = assertThrows(ApiException.class, () -> svc.deleteOwnAccount(2, Map.of("password", "Mo123456")));
    assertEquals(400, ex.status);
  }

  @Test
  void applyRejectedAfterDeadline() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "Test";
    j.status = "open";
    j.created_by = 2;
    j.quota = 2;
    j.deadline = "2000-01-01";
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    ApiException ex = assertThrows(ApiException.class, () -> svc.applyJob(3, 1));
    assertEquals(400, ex.status);
    assertTrue(ex.getMessage().contains("deadline"));
  }

  @Test
  void adminWorkloadCountsActiveApplicationsAndOver20Warning() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j1 = new JobRecord();
    j1.id = 1;
    j1.module_name = "J1";
    j1.status = "open";
    j1.created_by = 2;
    j1.assigned_hours = 12;
    j1.quota = 3;
    j1.created_at = Instant.now();
    j1.updated_at = Instant.now();
    jobs.add(j1);
    JobRecord j2 = new JobRecord();
    j2.id = 2;
    j2.module_name = "J2";
    j2.status = "open";
    j2.created_by = 2;
    j2.assigned_hours = 10;
    j2.quota = 3;
    j2.created_at = Instant.now();
    j2.updated_at = Instant.now();
    jobs.add(j2);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);

    List<ApplicationRecord> apps = new ArrayList<>();
    ApplicationRecord a1 = new ApplicationRecord();
    a1.id = 1;
    a1.job_id = 1;
    a1.ta_user_id = 3;
    a1.status = "pending";
    a1.created_at = Instant.now();
    apps.add(a1);
    ApplicationRecord a2 = new ApplicationRecord();
    a2.id = 2;
    a2.job_id = 2;
    a2.ta_user_id = 3;
    a2.status = "accepted";
    a2.created_at = Instant.now();
    apps.add(a2);
    ApplicationRecord a3 = new ApplicationRecord();
    a3.id = 3;
    a3.job_id = 2;
    a3.ta_user_id = 3;
    a3.status = "withdrawn";
    a3.created_at = Instant.now();
    apps.add(a3);
    AtomicJsonFile.writeAtomic(dataDir.resolve("applications.json"), apps);

    Map<String, Object> row = svc.adminWorkload(1, 20.0).stream()
        .filter(r -> ((Number) r.get("ta_user_id")).intValue() == 3)
        .findFirst()
        .orElseThrow();
    assertEquals(22.0, ((Number) row.get("total_hours")).doubleValue(), 0.0001);
    assertEquals(true, row.get("overloaded"));
    assertEquals(true, row.get("weekly_over_20"));
  }

  @Test
  void taListJobsDeadlineExpiredShowsClosedAndExcludesFromOpen() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "PastDeadline";
    j.status = "open";
    j.created_by = 2;
    j.quota = 2;
    j.deadline = "2000-01-01";
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    assertTrue(svc.listJobs(3, null, null, "open", null, null, null).stream().noneMatch(m -> m.get("id").equals(1)));
    Map<String, Object> closedRow = svc.listJobs(3, null, null, "closed", null, null, null).stream()
        .filter(m -> m.get("id").equals(1))
        .findFirst()
        .orElseThrow();
    assertEquals("closed", closedRow.get("status"));

    Map<String, Object> allRow = svc.listJobs(3, null, null, "all", null, null, null).stream()
        .filter(m -> m.get("id").equals(1))
        .findFirst()
        .orElseThrow();
    assertEquals("closed", allRow.get("status"));
  }

  @Test
  void taListJobsMarksFavoritedWhenNotUsingFavoritesOnlyFilter() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "FavStar";
    j.status = "open";
    j.created_by = 2;
    j.quota = 2;
    j.deadline = "";
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    assertDoesNotThrow(() -> svc.taToggleFavorite(3, 1));
    Map<String, Object> row = svc.listJobs(3, null, null, "open", null, false, null).stream()
        .filter(m -> m.get("id").equals(1))
        .findFirst()
        .orElseThrow();
    assertEquals(true, row.get("favorited"));
  }

  @Test
  void moListJobsKeepsTrueStatusWhenDeadlinePassed() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "MoStillOpenInDb";
    j.status = "open";
    j.created_by = 2;
    j.quota = 2;
    j.deadline = "2000-01-01";
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    Map<String, Object> row = svc.moJobs(2, "").stream()
        .filter(m -> m.get("id").equals(1))
        .findFirst()
        .orElseThrow();
    assertEquals("open", row.get("status"));
  }

  @Test
  void moCannotAccessOtherMoJob() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 10;
    j.module_name = "Other";
    j.status = "open";
    j.created_by = 99;
    j.quota = 1;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);

    ApiException ex = assertThrows(ApiException.class, () -> svc.moJobApplicants(2, 10, null, null));
    assertEquals(403, ex.status);
  }

  @Test
  void applyJobNotifiesMoOwner() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "NotifyMo";
    j.status = "open";
    j.created_by = 2;
    j.quota = 2;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    assertDoesNotThrow(() -> svc.applyJob(3, 1));

    List<NotificationRecord> notifs = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    assertTrue(notifs.stream().anyMatch(
        n -> n.user_id == 2
            && "application".equals(n.category)
            && n.link_job_id != null
            && n.link_job_id == 1
            && n.title.contains("新申请")));
  }

  @Test
  void moJobsIncludesPendingApplicationsCount() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "WithPending";
    j.status = "open";
    j.created_by = 2;
    j.quota = 3;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    List<ApplicationRecord> apps = new ArrayList<>();
    ApplicationRecord a1 = new ApplicationRecord();
    a1.id = 1;
    a1.job_id = 1;
    a1.ta_user_id = 3;
    a1.status = "pending";
    a1.created_at = Instant.now();
    apps.add(a1);
    ApplicationRecord a2 = new ApplicationRecord();
    a2.id = 2;
    a2.job_id = 1;
    a2.ta_user_id = 3;
    a2.status = "interviewing";
    a2.created_at = Instant.now();
    apps.add(a2);
    AtomicJsonFile.writeAtomic(dataDir.resolve("applications.json"), apps);

    Map<String, Object> row = svc.moJobs(2, "").stream()
        .filter(m -> m.get("id").equals(1))
        .findFirst()
        .orElseThrow();
    assertEquals(1, ((Number) row.get("pending_applications_count")).intValue());
  }

  @Test
  void applicationStatusMachineEnforced() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "StatusMachine";
    j.status = "open";
    j.created_by = 2;
    j.quota = 2;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    Map<String, Object> app = svc.applyJob(3, 1);
    int appId = ((Number) app.get("id")).intValue();

    Map<String, Object> interviewing = svc.moDecideApplication(2, appId, Map.of("status", "interviewing"));
    assertEquals("interviewing", interviewing.get("status"));

    Map<String, Object> accepted = svc.moDecideApplication(2, appId, Map.of("status", "accepted"));
    assertEquals("accepted", accepted.get("status"));

    ApiException ex = assertThrows(ApiException.class,
        () -> svc.moDecideApplication(2, appId, Map.of("status", "rejected")));
    assertEquals(400, ex.status);
    assertTrue(ex.getMessage().contains("Invalid application status transition"));
  }

  @Test
  void moDeleteJobRemovesJobAndCascadeWhenClosedOrCancelled() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "ClosedJob";
    j.status = "closed";
    j.created_by = 2;
    j.quota = 2;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);

    List<ApplicationRecord> apps = new ArrayList<>();
    ApplicationRecord a = new ApplicationRecord();
    a.id = 1;
    a.job_id = 1;
    a.ta_user_id = 3;
    a.status = "pending";
    a.created_at = Instant.now();
    apps.add(a);
    AtomicJsonFile.writeAtomic(dataDir.resolve("applications.json"), apps);

    List<ApplicationEvaluationRecord> evals = new ArrayList<>();
    ApplicationEvaluationRecord ev = new ApplicationEvaluationRecord();
    ev.id = 1;
    ev.application_id = 1;
    ev.job_id = 1;
    ev.updated_by = 2;
    ev.updated_at = Instant.now();
    evals.add(ev);
    AtomicJsonFile.writeAtomic(dataDir.resolve("application_evaluations.json"), evals);

    List<NotificationRecord> notifs = new ArrayList<>();
    NotificationRecord n = new NotificationRecord();
    n.id = 1;
    n.user_id = 3;
    n.title = "t";
    n.link_job_id = 1;
    n.read = false;
    n.created_at = Instant.now();
    notifs.add(n);
    AtomicJsonFile.writeAtomic(dataDir.resolve("notifications.json"), notifs);

    List<AssignmentRecord> assigns = new ArrayList<>();
    AssignmentRecord asg = new AssignmentRecord();
    asg.id = 1;
    asg.ta_user_id = 3;
    asg.job_id = 1;
    asg.application_id = 1;
    asg.assigned_hours = 5;
    asg.created_at = Instant.now();
    assigns.add(asg);
    AtomicJsonFile.writeAtomic(dataDir.resolve("assignments.json"), assigns);

    List<JobFavoriteRecord> favs = new ArrayList<>();
    JobFavoriteRecord f = new JobFavoriteRecord();
    f.user_id = 3;
    f.job_id = 1;
    favs.add(f);
    AtomicJsonFile.writeAtomic(dataDir.resolve("job_favorites.json"), favs);

    List<ActivityLogRecord> logs = new ArrayList<>();
    ActivityLogRecord lg = new ActivityLogRecord();
    lg.id = 1;
    lg.actor_user_id = 2;
    lg.action = "job_closed";
    lg.entity_type = "job";
    lg.entity_id = 1;
    lg.payload = Map.of();
    lg.created_at = Instant.now();
    logs.add(lg);
    AtomicJsonFile.writeAtomic(dataDir.resolve("activity_logs.json"), logs);

    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    c.applicationSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    Map<String, Object> out = assertDoesNotThrow(() -> svc.moDeleteJob(2, 1));
    assertTrue(Boolean.TRUE.equals(out.get("ok")));

    List<JobRecord> jobsAfter = AtomicJsonFile.readList(
        dataDir.resolve("jobs.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<JobRecord>>() {},
        new ArrayList<>());
    assertTrue(jobsAfter.stream().noneMatch(x -> x.id == 1));

    List<ApplicationRecord> appsAfter = AtomicJsonFile.readList(
        dataDir.resolve("applications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<ApplicationRecord>>() {},
        new ArrayList<>());
    assertTrue(appsAfter.stream().noneMatch(x -> x.job_id == 1));

    List<ApplicationEvaluationRecord> evalsAfter = AtomicJsonFile.readList(
        dataDir.resolve("application_evaluations.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<ApplicationEvaluationRecord>>() {},
        new ArrayList<>());
    assertTrue(evalsAfter.stream().noneMatch(x -> x.job_id == 1));

    List<NotificationRecord> notifsAfter = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    assertTrue(notifsAfter.stream().noneMatch(x -> Integer.valueOf(1).equals(x.link_job_id)));

    List<AssignmentRecord> assignsAfter = AtomicJsonFile.readList(
        dataDir.resolve("assignments.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<AssignmentRecord>>() {},
        new ArrayList<>());
    assertTrue(assignsAfter.stream().noneMatch(x -> x.job_id == 1));

    List<JobFavoriteRecord> favsAfter = AtomicJsonFile.readList(
        dataDir.resolve("job_favorites.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<JobFavoriteRecord>>() {},
        new ArrayList<>());
    assertTrue(favsAfter.stream().noneMatch(x -> x.job_id == 1));

    List<ActivityLogRecord> logsAfter = AtomicJsonFile.readList(
        dataDir.resolve("activity_logs.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<ActivityLogRecord>>() {},
        new ArrayList<>());
    assertFalse(logsAfter.stream().anyMatch(x -> "job_closed".equals(x.action) && x.entity_id != null && x.entity_id == 1));
    assertTrue(logsAfter.stream().anyMatch(x -> "job_deleted".equals(x.action)));
  }

  @Test
  void moDeleteJobRejectsNonTerminalStatus() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 5;
    j.module_name = "OpenJob";
    j.status = "open";
    j.created_by = 2;
    j.quota = 1;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);

    ApiException ex = assertThrows(ApiException.class, () -> svc.moDeleteJob(2, 5));
    assertEquals(400, ex.status);
    assertTrue(ex.getMessage().contains("closed or cancelled"));
  }

  @Test
  void publishedJobNotifiesAllTas() throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("module_name", "PubMod");
    body.put("publish", true);
    Map<String, Object> job = assertDoesNotThrow(() -> svc.moCreateJob(2, body));
    int jid = ((Number) job.get("id")).intValue();

    List<NotificationRecord> notifs = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    List<NotificationRecord> forTa = notifs.stream().filter(n -> n.user_id == 3).toList();
    assertEquals(1, forTa.size());
    assertEquals("job", forTa.get(0).category);
    assertEquals(jid, forTa.get(0).link_job_id.intValue());
    assertTrue(forTa.get(0).title.contains("新岗位"));
  }

  @Test
  void draftJobDoesNotSendOpenJobNotifications() throws Exception {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("module_name", "DraftMod");
    body.put("publish", false);
    assertDoesNotThrow(() -> svc.moCreateJob(2, body));
    List<NotificationRecord> notifs = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    assertTrue(notifs.stream().noneMatch(n -> "job".equals(n.category)));
  }

  @Test
  void transitionDraftToOpenNotifiesTas() throws Exception {
    List<JobRecord> jobs = new ArrayList<>();
    JobRecord j = new JobRecord();
    j.id = 1;
    j.module_name = "LaterOpen";
    j.status = "draft";
    j.created_by = 2;
    j.quota = 1;
    j.created_at = Instant.now();
    j.updated_at = Instant.now();
    jobs.add(j);
    AtomicJsonFile.writeAtomic(dataDir.resolve("jobs.json"), jobs);
    Counters c = AtomicJsonFile.readObject(dataDir.resolve("counters.json"), Counters.class, new Counters());
    c.jobSeq = 2;
    AtomicJsonFile.writeAtomic(dataDir.resolve("counters.json"), c);

    assertDoesNotThrow(() -> svc.moTransitionJob(2, 1, Map.of("to", "open")));

    List<NotificationRecord> notifs = AtomicJsonFile.readList(
        dataDir.resolve("notifications.json"),
        new com.fasterxml.jackson.core.type.TypeReference<List<NotificationRecord>>() {},
        new ArrayList<>());
    assertTrue(notifs.stream().anyMatch(n -> n.user_id == 3 && "job".equals(n.category) && n.link_job_id == 1));
  }
}
