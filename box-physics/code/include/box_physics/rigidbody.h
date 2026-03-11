#ifndef BP_RIGIDBODY_H
#define BP_RIGIDBODY_H

#include "box_physics/shape.h"
#include "box_physics/collision.h"

#define RB_FLAG_DYNAMIC 0x01
#define RB_FLAG_KINEMATIC 0x02
#define RB_FLAG_STATIC 0x04

/**
 * @brief Represents a body that can be acted upon by forces and can collide with other bodies.
 */
typedef struct rigidbody_s {
    vec3 position;
    vec3 velocity;
    vec3 forceAccumulator;
    float mass;
    float invMass;
    uint8_t flags;
    shape_aabb_t localBounding;
    shape_aabb_t worldBounding;
    collision_shape_t collisionShape;
    void *owner;
} rigidbody_t;

/**
 * @brief Creates a new Rigidbody and returns a pointer to it.
 * @note The returned pointer is NOT OWNED by the caller and should not be freed directly. Use rigidbody_destroy() to free it.
 *
 * @return A pointer to the newly created Rigidbody, or NULL on failure.
 */
rigidbody_t* rigidbody_create(void);

/**
 * @brief Initializes a Rigidbody with the given parameters.
 *
 * @param rb The Rigidbody to initialize. Must not be NULL.
 * @param position The initial position of the Rigidbody in world space.
 * @param mass The mass of the Rigidbody. A value of 0 indicates an immovable object.
 * @param size The size of the Rigidbody's bounding box (used for collision detection).
 * @param flags A bitmask of RB_FLAG_DYNAMIC, RB_FLAG_KINEMATIC, and/or RB_FLAG_STATIC to define the Rigidbody's behavior.
 *
 * @return A pointer to the initialized Rigidbody, or NULL if initialization failed.
 */
rigidbody_t* rigidbody_init(rigidbody_t* rb, vec3 position, float mass, const vec3 size, uint8_t flags);

/**
 * @brief Destroys the given Rigidbody, freeing its resources and making it available for reuse.
 *
 * @param rb The Rigidbody to destroy. Must not be NULL.
 */
void rigidbody_destroy(rigidbody_t *rb);

void rigidbody_set_mass(rigidbody_t *rb, float mass);

void rigidbody_set_size(rigidbody_t *rb, const vec3 size);

/**
 * @brief Applies a force to the Rigidbody at its center of mass.
 *
 * @param rb The Rigidbody to apply the force to. Must not be NULL.
 * @param force The force vector to apply.
 */
void rigidbody_add_force(rigidbody_t *rb, vec3 force);

/**
 * @brief Applies an impulse to the Rigidbody, instantly changing its velocity.
 *
 * @param rb The Rigidbody to apply the impulse to. Must not be NULL.
 * @param impulse The impulse vector to apply.
 */
void rigidbody_add_impulse(rigidbody_t *rb, vec3 impulse);


#endif /* BP_RIGIDBODY_H */