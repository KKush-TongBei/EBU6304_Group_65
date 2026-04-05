package com.ebu6304.tarecruit.store;

import com.ebu6304.tarecruit.AppJson;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

public final class AtomicJsonFile {
  private static final ObjectMapper M = AppJson.mapper();

  private AtomicJsonFile() {}

  public static <T> T readObject(Path path, Class<T> type, T defaultValue) throws IOException {
    if (!Files.exists(path)) {
      return defaultValue;
    }
    byte[] bytes = Files.readAllBytes(path);
    if (bytes.length == 0) {
      return defaultValue;
    }
    return M.readValue(bytes, type);
  }

  public static <T> T readList(Path path, TypeReference<T> ref, T emptyDefault) throws IOException {
    if (!Files.exists(path)) {
      return emptyDefault;
    }
    byte[] bytes = Files.readAllBytes(path);
    if (bytes.length == 0) {
      return emptyDefault;
    }
    return M.readValue(bytes, ref);
  }

  public static void writeAtomic(Path path, Object value) throws IOException {
    Files.createDirectories(path.getParent());
    Path tmp = Files.createTempFile(path.getParent(), path.getFileName() + ".", ".tmp");
    try {
      M.writerWithDefaultPrettyPrinter().writeValue(tmp.toFile(), value);
      M.readTree(tmp.toFile());
      try {
        Files.move(tmp, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
      } catch (AtomicMoveNotSupportedException e) {
        Files.move(tmp, path, StandardCopyOption.REPLACE_EXISTING);
      }
    } finally {
      Files.deleteIfExists(tmp);
    }
  }
}
