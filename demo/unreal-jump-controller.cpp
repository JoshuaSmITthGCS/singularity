// Unreal C++ Character Jump Controller
// Translated from Unity C# with physics conversion
// COORDINATE SYSTEM: Unity Y-up → Unreal Z-up
// UNIT SCALE: Unity meters → Unreal centimeters (multiply by 100)
// GRAVITY: Unity -9.81 m/s² → Unreal -980 cm/s²

#include "CharacterJumpController.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/Character.h"

// Sets default values for this component's properties
UCharacterJumpController::UCharacterJumpController()
{
    PrimaryComponentTick.bCanEverTick = true;

    // Unity: 5.0 m/s → Unreal: 500 cm/s
    MoveSpeed = 500.0f;

    // Unity: 2.0 m height → Unreal: 200 cm height
    JumpHeight = 200.0f;

    // Unity: -9.81 m/s² → Unreal: -980 cm/s²
    Gravity = -980.0f;

    Velocity = FVector::ZeroVector;
    bIsGrounded = false;
}

void UCharacterJumpController::BeginPlay()
{
    Super::BeginPlay();

    // Get character reference
    ACharacter* Character = Cast<ACharacter>(GetOwner());
    if (Character)
    {
        MovementComponent = Character->GetCharacterMovement();
        if (MovementComponent)
        {
            // Set custom gravity (converted from Unity)
            MovementComponent->GravityScale = Gravity / -980.0f; // Normalize to Unreal's default
        }
    }
}

void UCharacterJumpController::TickComponent(float DeltaTime, ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (!MovementComponent) return;

    // Ground check (Unity: controller.isGrounded → Unreal: MovementComponent->IsMovingOnGround())
    bIsGrounded = MovementComponent->IsMovingOnGround();

    if (bIsGrounded && Velocity.Z < 0)
    {
        // Unity: velocity.y = -2f → Unreal: velocity.Z = -200f (scaled by 100)
        Velocity.Z = -200.0f; // Small downward force to stay grounded
    }

    // Horizontal movement (converted from Unity input system)
    ACharacter* Character = Cast<ACharacter>(GetOwner());
    if (Character)
    {
        // Unity uses X/Z for horizontal, Unreal uses X/Y
        FVector ForwardVector = Character->GetActorForwardVector();
        FVector RightVector = Character->GetActorRightVector();

        // Input would come from player controller in actual implementation
        float Horizontal = 0.0f; // Placeholder - would be InputComponent->GetAxisValue("MoveRight")
        float Vertical = 0.0f;   // Placeholder - would be InputComponent->GetAxisValue("MoveForward")

        FVector MoveDirection = (RightVector * Horizontal + ForwardVector * Vertical).GetSafeNormal();
        Character->AddMovementInput(MoveDirection, MoveSpeed * DeltaTime);
    }

    // Apply gravity (Unity: velocity.y → Unreal: velocity.Z)
    Velocity.Z += Gravity * DeltaTime;

    // Apply vertical movement
    if (MovementComponent)
    {
        MovementComponent->AddForce(FVector(0, 0, Velocity.Z));
    }
}

void UCharacterJumpController::Jump()
{
    if (!bIsGrounded) return;

    // Calculate jump velocity to reach desired height
    // Unity formula: v = sqrt(2 * |gravity| * height)
    // Same formula in Unreal, but with converted units
    // Unity: sqrt(2 * 9.81 * 2.0) = 6.26 m/s
    // Unreal: sqrt(2 * 980 * 200) = 626 cm/s (exactly 100x)

    Velocity.Z = FMath::Sqrt(-2.0f * Gravity * JumpHeight);
}

void UCharacterJumpController::SetJumpHeight(float Height)
{
    // Unity: height in meters → Unreal: height in centimeters
    // Clamp to minimum 10 cm (0.1m in Unity)
    JumpHeight = FMath::Max(10.0f, Height);
}

FVector UCharacterJumpController::GetVelocity() const
{
    return Velocity;
}

bool UCharacterJumpController::IsGrounded() const
{
    return bIsGrounded;
}
