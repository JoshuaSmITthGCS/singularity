// Unity C# Character Jump Controller
// Demonstrates physics-based character movement with configurable jump height

using UnityEngine;

public class CharacterJumpController : MonoBehaviour
{
    [Header("Movement Settings")]
    [SerializeField] private float moveSpeed = 5.0f;

    [Header("Jump Settings")]
    [SerializeField] private float jumpHeight = 2.0f;
    [SerializeField] private float gravity = -9.81f;

    private CharacterController controller;
    private Vector3 velocity;
    private bool isGrounded;

    void Start()
    {
        controller = GetComponent<CharacterController>();
    }

    void Update()
    {
        // Ground check
        isGrounded = controller.isGrounded;
        if (isGrounded && velocity.y < 0)
        {
            velocity.y = -2f; // Small downward force to stay grounded
        }

        // Horizontal movement
        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        Vector3 move = transform.right * horizontal + transform.forward * vertical;
        controller.Move(move * moveSpeed * Time.deltaTime);

        // Jump
        if (Input.GetButtonDown("Jump") && isGrounded)
        {
            // Calculate jump velocity needed to reach desired height
            // Formula: v = sqrt(2 * |gravity| * height)
            velocity.y = Mathf.Sqrt(-2f * gravity * jumpHeight);
        }

        // Apply gravity
        velocity.y += gravity * Time.deltaTime;

        // Apply vertical movement
        controller.Move(velocity * Time.deltaTime);
    }

    // Public method to set jump height dynamically
    public void SetJumpHeight(float height)
    {
        jumpHeight = Mathf.Max(0.1f, height);
    }

    // Get current velocity for testing
    public Vector3 GetVelocity()
    {
        return velocity;
    }

    // Check if character is currently grounded
    public bool IsGrounded()
    {
        return isGrounded;
    }
}
