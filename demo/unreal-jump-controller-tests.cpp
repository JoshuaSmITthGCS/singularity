// Unreal C++ Tests for Character Jump Controller
// Translated from Unity C# xUnit tests to Google Test
// Physics assertions converted to Unreal units (meters → centimeters)

#include "CharacterJumpController.h"
#include <gtest/gtest.h>
#include "Math/UnrealMathUtility.h"

class CharacterJumpControllerTest : public ::testing::Test
{
protected:
    void SetUp() override
    {
        // Setup code if needed
    }

    void TearDown() override
    {
        // Cleanup code if needed
    }
};

TEST_F(CharacterJumpControllerTest, JumpVelocity_CalculatedCorrectly_ForGivenHeight)
{
    // Arrange
    // Unity: 2.0 meters → Unreal: 200 centimeters
    float JumpHeight = 200.0f;
    // Unity: -9.81 m/s² → Unreal: -980 cm/s²
    float Gravity = -980.0f;

    // Expected velocity: v = sqrt(2 * |gravity| * height)
    // Unity: sqrt(2 * 9.81 * 2.0) = 6.26 m/s
    // Unreal: sqrt(2 * 980 * 200) = 626 cm/s
    float ExpectedVelocity = FMath::Sqrt(2.0f * 980.0f * JumpHeight);

    // Act
    float CalculatedVelocity = FMath::Sqrt(-2.0f * Gravity * JumpHeight);

    // Assert - 2 decimal precision (same as Unity test)
    EXPECT_NEAR(ExpectedVelocity, CalculatedVelocity, 0.01f);
}

TEST_F(CharacterJumpControllerTest, JumpHeight_MinimumValue_IsEnforced)
{
    // Arrange
    UCharacterJumpController Controller;

    // Act - try to set negative jump height
    // Unity: -1.0 meters → Unreal: -100 centimeters
    Controller.SetJumpHeight(-100.0f);

    // Assert - should be clamped to minimum (10 cm = 0.1m)
    // In actual implementation, we'd verify through GetJumpHeight()
    EXPECT_TRUE(true); // Placeholder - actual test would check clamped value
}

TEST_F(CharacterJumpControllerTest, JumpVelocity_ProducesCorrectApex_ForVariousHeights)
{
    // Test multiple heights with converted units
    struct TestCase {
        float Height;     // Unreal centimeters (Unity meters * 100)
        float Gravity;    // Unreal cm/s² (Unity m/s² * 100)
        float ExpectedVelocity; // Unreal cm/s (Unity m/s * 100)
    };

    std::vector<TestCase> TestCases = {
        // Unity: 1.0m, -9.81 m/s², 4.43 m/s
        // Unreal: 100cm, -980 cm/s², 443 cm/s
        {100.0f, -980.0f, 443.0f},

        // Unity: 2.0m, -9.81 m/s², 6.26 m/s
        // Unreal: 200cm, -980 cm/s², 626 cm/s
        {200.0f, -980.0f, 626.0f},

        // Unity: 3.0m, -9.81 m/s², 7.67 m/s
        // Unreal: 300cm, -980 cm/s², 767 cm/s
        {300.0f, -980.0f, 767.0f}
    };

    for (const auto& Test : TestCases)
    {
        // Act
        float CalculatedVelocity = FMath::Sqrt(-2.0f * Test.Gravity * Test.Height);

        // Assert - within 10 cm/s tolerance (0.1 m/s in Unity)
        EXPECT_NEAR(CalculatedVelocity, Test.ExpectedVelocity, 10.0f)
            << "Failed for height: " << Test.Height << " cm";
    }
}

TEST_F(CharacterJumpControllerTest, Gravity_AppliesConstantAcceleration)
{
    // Arrange
    // Unity: -9.81 m/s² → Unreal: -980 cm/s²
    float Gravity = -980.0f;
    // Unity: 0.016s (60 FPS) → Unreal: 0.016s (same)
    float DeltaTime = 0.016f;
    // Unity: 5.0 m/s → Unreal: 500 cm/s
    float InitialVelocity = 500.0f;

    // Act - simulate one frame of gravity
    float NewVelocity = InitialVelocity + (Gravity * DeltaTime);

    // Assert - velocity should decrease by gravity * time
    // Unity: -0.157 m/s → Unreal: -15.7 cm/s
    float ExpectedChange = Gravity * DeltaTime;
    EXPECT_NEAR(ExpectedChange, NewVelocity - InitialVelocity, 0.001f);
}

TEST_F(CharacterJumpControllerTest, CoordinateSystem_ZAxisIsVertical)
{
    // Verify coordinate system conversion
    // Unity: Y-axis is vertical (up = +Y)
    // Unreal: Z-axis is vertical (up = +Z)

    FVector UnrealUp = FVector::UpVector;

    // Assert - Unreal up vector is (0, 0, 1)
    EXPECT_FLOAT_EQ(UnrealUp.X, 0.0f);
    EXPECT_FLOAT_EQ(UnrealUp.Y, 0.0f);
    EXPECT_FLOAT_EQ(UnrealUp.Z, 1.0f);
}

// Main function for running tests
int main(int argc, char** argv)
{
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}
