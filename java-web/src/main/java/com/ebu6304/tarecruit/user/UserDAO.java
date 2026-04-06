package com.ebu6304.tarecruit.user;

import com.ebu6304.tarecruit.domain.UserRecord;
import com.ebu6304.tarecruit.store.AtomicJsonFile;
import com.fasterxml.jackson.core.type.TypeReference;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * DAO for users.json persisted in local files (no database).
 */
public final class UserDAO {
  private static volatile UserDAO INSTANCE;
  private static final TypeReference<List<UserRecord>> USERS_REF = new TypeReference<>() {};

  private final Path usersPath;
  private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();

  private UserDAO(Path usersPath) {
    this.usersPath = usersPath.toAbsolutePath().normalize();
  }

  public static UserDAO getInstance() {
    if (INSTANCE == null) {
      synchronized (UserDAO.class) {
        if (INSTANCE == null) {
          INSTANCE = new UserDAO(Path.of(System.getProperty("user.dir"), "data", "users.json"));
        }
      }
    }
    return INSTANCE;
  }

  /**
   * Dedicated constructor for tests or custom runtime paths.
   */
  static UserDAO forPath(Path usersPath) {
    return new UserDAO(usersPath);
  }

  public List<UserRecord> readAll() {
    rw.readLock().lock();
    try {
      return new ArrayList<>(AtomicJsonFile.readList(usersPath, USERS_REF, new ArrayList<>()));
    } catch (IOException e) {
      throw new IllegalStateException("Failed to read users from " + usersPath, e);
    } finally {
      rw.readLock().unlock();
    }
  }

  public Optional<UserRecord> findByEmail(String email) {
    if (email == null) {
      return Optional.empty();
    }
    String normalized = email.trim();
    return readAll().stream().filter(u -> u.email != null && u.email.equalsIgnoreCase(normalized)).findFirst();
  }

  public UserRecord insert(UserRecord user) {
    rw.writeLock().lock();
    try {
      List<UserRecord> users = AtomicJsonFile.readList(usersPath, USERS_REF, new ArrayList<>());
      users.add(user);
      AtomicJsonFile.writeAtomic(usersPath, users);
      return user;
    } catch (IOException e) {
      throw new IllegalStateException("Failed to write users to " + usersPath, e);
    } finally {
      rw.writeLock().unlock();
    }
  }

  public int nextUserId() {
    return readAll().stream().mapToInt(u -> u.id).max().orElse(0) + 1;
  }
}
