@forms
Feature: Form actions, with JavaScript and without
  The demo's word game is one form: every key of its keyboard is a button of it. With JavaScript the
  app takes the keys in the page and sends a guess as the form's action inside the page; without it,
  every key and every guess posts the form and loads the page it answers with. The same steps run in
  both: each waits for what its mode brings.

  @critical
  Scenario: A word the game knows is accepted, and its row says how close it was
    Given I am on "/sverdle"
    When I submit the form with the "a" button
    And I submit the form with the "b" button
    And I submit the form with the "o" button
    And I submit the form with the "u" button
    And I submit the form with the "t" button
    And I submit the form with the "enter" button
    Then the app should have accepted the form
    And I should see text matching "\((correct|present|absent)\)"

  Scenario: A word the game does not know is refused
    Given I am on "/sverdle"
    When I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "enter" button
    Then the app should have refused the form

  @needs-javascript
  Scenario: With JavaScript, a guess is sent inside the page
    Given I am on "/sverdle"
    When I submit the form with the "a" button
    And I submit the form with the "b" button
    And I submit the form with the "o" button
    And I submit the form with the "u" button
    And I submit the form with the "t" button
    And I submit the form with the "enter" button
    Then the form should have been sent without loading the page
    And the app should have accepted the form

  @no-javascript
  Scenario: Without JavaScript, a key and a guess each load the page
    Given I am on "/sverdle"
    When I submit the form with the "a" button
    Then the form should have been sent with a page load
    And the app should have accepted the form
