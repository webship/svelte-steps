@must-fail
Feature: Assertions on form actions that must fail
  Each scenario asserts something that is not true of the demo's word game, at its last step.

  Scenario: A word the game does not know
    Fails with: Expected the app to have accepted the form, but it answered 400.
    Given I am on "/sverdle"
    When I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "enter" button
    Then the app should have accepted the form

  @needs-javascript
  Scenario: A key the app takes in the page
    Fails with: Expected the app to have refused the form, but the "a" button sent nothing.
    Given I am on "/sverdle"
    When I submit the form with the "a" button
    Then the app should have refused the form

  @needs-javascript
  Scenario: A guess sent inside the page
    Fails with: Expected the form to have been sent with a page load, but it was sent inside the page.
    Given I am on "/sverdle"
    When I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "z" button
    And I submit the form with the "enter" button
    Then the form should have been sent with a page load

  @no-javascript
  Scenario: A key that posts the form
    Fails with: Expected the form to have been sent without loading the page, but it was sent with a page load.
    Given I am on "/sverdle"
    When I submit the form with the "a" button
    Then the form should have been sent without loading the page

  Scenario: A guess of no letters
    Fails with: Could not submit the form with the "enter" button: it is disabled.
    Given I am on "/sverdle"
    When I submit the form with the "enter" button

  Scenario: A button the forms do not have
    Fails with: Expected a button named "Send" in a form of the page, but there is none.
    Given I am on "/sverdle"
    When I submit the form with the "Send" button

  Scenario: No form sent yet
    Fails with: Expected a form the scenario submitted, but none of its steps submitted one.
    Given I am on "/sverdle"
    Then the app should have accepted the form
