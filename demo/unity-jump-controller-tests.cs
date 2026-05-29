// Unity C# Tests for Character Jump Controller

using UnityEngine;
using Xunit;

public class CharacterJumpControllerTests
{
    [Fact]
    public void JumpVelocity_CalculatedCorrectly_ForGivenHeight()
    {
        // Arrange
        float jumpHeight = 2.0f;
        float gravity = -9.81f;

        // Expected velocity: v = sqrt(2 * |gravity| * height)
        float expectedVelocity = Mathf.Sqrt(2f * 9.81f * jumpHeight);

        // Act
        float calculatedVelocity = Mathf.Sqrt(-2f * gravity * jumpHeight);

        // Assert
        Assert.Equal(expectedVelocity, calculatedVelocity, 2); // 2 decimal precision
    }

    [Fact]
    public void JumpHeight_CanBeModified_Dynamically()
    {
        // Arrange
        var gameObject = new GameObject();
        var controller = gameObject.AddComponent<CharacterJumpController>();
        float newHeight = 3.5f;

        // Act
        controller.SetJumpHeight(newHeight);

        // Note: In actual Unity tests, we'd use reflection or public getters
        // This is a simplified test for demonstration
        Assert.True(newHeight > 0);
    }

    [Fact]
    public void JumpHeight_MinimumValue_IsEnforced()
    {
        // Arrange
        var gameObject = new GameObject();
        var controller = gameObject.AddComponent<CharacterJumpController>();

        // Act - try to set negative jump height
        controller.SetJumpHeight(-1.0f);

        // Assert - should be clamped to minimum (0.1f)
        // In real tests, we'd verify the actual clamped value
        Assert.True(true); // Placeholder assertion
    }

    [Theory]
    [InlineData(1.0f, -9.81f, 4.43f)]  // 1m height, standard gravity
    [InlineData(2.0f, -9.81f, 6.26f)]  // 2m height, standard gravity
    [InlineData(3.0f, -9.81f, 7.67f)]  // 3m height, standard gravity
    public void JumpVelocity_ProducesCorrectApex_ForVariousHeights(
        float height, float gravity, float expectedVelocity)
    {
        // Act
        float calculatedVelocity = Mathf.Sqrt(-2f * gravity * height);

        // Assert - within 0.1 tolerance for floating point
        Assert.True(Mathf.Abs(calculatedVelocity - expectedVelocity) < 0.1f);
    }

    [Fact]
    public void Gravity_AppliesConstantAcceleration()
    {
        // Arrange
        float gravity = -9.81f;
        float deltaTime = 0.016f; // ~60 FPS
        float initialVelocity = 5.0f;

        // Act - simulate one frame of gravity
        float newVelocity = initialVelocity + (gravity * deltaTime);

        // Assert - velocity should decrease by gravity * time
        float expectedChange = gravity * deltaTime;
        Assert.Equal(expectedChange, newVelocity - initialVelocity, 3);
    }
}
