// Unreal C++ Character Jump Controller Header
// Translated from Unity C# with physics conversion

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "CharacterJumpController.generated.h"

class UCharacterMovementComponent;

UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class SINGULARITYASSET_API UCharacterJumpController : public UActorComponent
{
    GENERATED_BODY()

public:
    UCharacterJumpController();

protected:
    virtual void BeginPlay() override;

public:
    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

    // Movement settings (converted from Unity meters to Unreal centimeters)
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Movement")
    float MoveSpeed;

    // Jump settings (converted from Unity meters to Unreal centimeters)
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jump")
    float JumpHeight;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Jump")
    float Gravity;

    // Public methods
    UFUNCTION(BlueprintCallable, Category = "Jump")
    void Jump();

    UFUNCTION(BlueprintCallable, Category = "Jump")
    void SetJumpHeight(float Height);

    UFUNCTION(BlueprintCallable, Category = "Jump")
    FVector GetVelocity() const;

    UFUNCTION(BlueprintCallable, Category = "Jump")
    bool IsGrounded() const;

private:
    FVector Velocity;
    bool bIsGrounded;

    UPROPERTY()
    UCharacterMovementComponent* MovementComponent;
};
