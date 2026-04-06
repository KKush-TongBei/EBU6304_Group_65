package com.ebu6304.tarecruit.user;

import com.ebu6304.tarecruit.auth.Passwords;
import com.ebu6304.tarecruit.domain.UserRecord;
import com.ebu6304.tarecruit.store.AtomicJsonFile;
import com.fasterxml.jackson.core.type.TypeReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserServiceTest {

  @TempDir
  Path tempDir;

  @Test
  void registerStoresBcryptHashAndRole() throws Exception {
    Path usersPath = tempDir.resolve("users.json");
    UserService service = UserService.forPath(usersPath);

    UserRecord out = service.register("ta1@test.edu", "Abcd1234", UserRole.TA, "TA One", "2025001");

    assertEquals("ta", out.role);
    assertNull(out.password_hash);

    List<UserRecord> saved = AtomicJsonFile.readList(usersPath, new TypeReference<List<UserRecord>>() {}, new ArrayList<>());
    assertEquals(1, saved.size());
    assertNotNull(saved.get(0).password_hash);
    assertTrue(saved.get(0).password_hash.startsWith("$2"));
    assertTrue(Passwords.verify("Abcd1234", saved.get(0).password_hash));
  }

  @Test
  void loginValidatesPasswordWithBcrypt() {
    Path usersPath = tempDir.resolve("users.json");
    UserService service = UserService.forPath(usersPath);
    service.register("admin@test.edu", "Admin1234", UserRole.ADMIN, "admin", null);

    UserRecord loggedIn = service.login("admin@test.edu", "Admin1234");
    assertEquals("admin", loggedIn.role);
    assertNull(loggedIn.password_hash);

    assertThrows(IllegalArgumentException.class, () -> service.login("admin@test.edu", "Wrong1234"));
  }

  @Test
  void malformedJsonThrowsReadableError() throws Exception {
    Path usersPath = tempDir.resolve("users.json");
    Files.writeString(usersPath, "{not-valid-json");
    UserService service = UserService.forPath(usersPath);

    IllegalStateException ex = assertThrows(IllegalStateException.class,
        () -> service.register("mo@test.edu", "Mo123456", UserRole.MO, "MO", null));
    assertTrue(ex.getMessage().contains("Failed to read users"));
  }

  @Test
  void duplicateEmailRejected() {
    Path usersPath = tempDir.resolve("users.json");
    UserService service = UserService.forPath(usersPath);
    service.register("same@test.edu", "Abcd1234", UserRole.TA, "A", "2025002");

    assertThrows(IllegalArgumentException.class,
        () -> service.register("same@test.edu", "Abcd1234", UserRole.TA, "B", "2025003"));
  }

  @Test
  void persistNewStaffWritesMoWithAssignedId() throws Exception {
    Path usersPath = tempDir.resolve("users.json");
    UserService service = UserService.forPath(usersPath);
    UserRecord out = service.persistNewStaff(7, "mo7@test.edu", "Mo123456", UserRole.MO, "MO Seven", null);
    assertEquals(7, out.id);
    assertEquals("mo", out.role);
    assertNull(out.password_hash);

    List<UserRecord> saved = AtomicJsonFile.readList(usersPath, new TypeReference<List<UserRecord>>() {}, new ArrayList<>());
    assertEquals(1, saved.size());
    assertTrue(Passwords.verify("Mo123456", saved.get(0).password_hash));
  }

  @Test
  void persistNewStaffRejectsTaRole() {
    Path usersPath = tempDir.resolve("users.json");
    UserService service = UserService.forPath(usersPath);
    assertThrows(IllegalArgumentException.class,
        () -> service.persistNewStaff(1, "ta@test.edu", "Abcd1234", UserRole.TA, "T", "2025001"));
  }
}
