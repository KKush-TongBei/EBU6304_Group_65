package com.ebu6304.tarecruit;

import com.ebu6304.tarecruit.api.ApiException;
import com.ebu6304.tarecruit.auth.JwtHelper;
import com.ebu6304.tarecruit.auth.Passwords;
import com.ebu6304.tarecruit.domain.Counters;
import com.ebu6304.tarecruit.domain.JobRecord;
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
    assertEquals(403, ex.status);
  }

  @Test
  void taRegisterSucceeds() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("email", "newta@test.edu");
    body.put("password", "Abcd1234");
    body.put("student_id", "2025888");
    Map<String, Object> tok = assertDoesNotThrow(() -> svc.register(body));
    assertTrue(tok.containsKey("access_token"));
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
}
