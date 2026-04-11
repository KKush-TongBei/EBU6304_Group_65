package com.ebu6304.tarecruit.api;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InputValidationTest {

  @Test
  void acceptsValidEmail() {
    assertEquals("a@b.co", InputValidation.validateEmail("  a@b.co  "));
  }

  @Test
  void rejectsInvalidEmail() {
    assertThrows(ApiException.class, () -> InputValidation.validateEmail("nope"));
    assertThrows(ApiException.class, () -> InputValidation.validateEmail("a@b"));
  }

  @Test
  void rejectsTooLongEmail() {
    String s = "a".repeat(250) + "@x.co";
    assertThrows(ApiException.class, () -> InputValidation.validateEmail(s));
  }

  @Test
  void maxLengthRejectsOverLimit() {
    assertThrows(ApiException.class, () -> InputValidation.maxLength("ab", 1, "f"));
  }
}
