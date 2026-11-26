@counter @needs-javascript
Feature: A count that moves to its new value
  The home page's counter moves its digits with a spring: frames for a third of a second after each
  tap, and no animation the browser lists. The steps wait for the frames to end.

  @settle-after-steps
  Scenario: After a tap, the step that follows sees the new count
    Given I am on "/"
    When I press "Increase the counter by one" by attr
    Then I should see "1" in the ".counter-viewport strong:not([aria-hidden])" element
    When I press "Decrease the counter by one" by attr
    And I press "Decrease the counter by one" by attr
    Then I should see "-1" in the ".counter-viewport strong:not([aria-hidden])" element

  Scenario: The app comes to rest when asked
    Given I am on "/"
    And the app has taken over the page
    When I press "Increase the counter by one" by attr
    And I wait for the app to come to rest
    Then I should see "1" in the ".counter-viewport strong:not([aria-hidden])" element
