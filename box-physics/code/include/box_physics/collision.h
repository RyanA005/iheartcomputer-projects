#ifndef BP_COLLISION_H
#define BP_COLLISION_H

#include "box_physics/shape.h"

struct rigidbody_s;

/**
 * @brief Data structure representing a collision shape.
 * Currently only supports AABB, but can be extended to support OBB and other shapes in the future.
 */
typedef shape_aabb_t collision_shape_t;

/** @brief Data structure representing a collision contact between two rigidbodies */
typedef struct collision_contact_s {
    struct rigidbody_s *a;
    struct rigidbody_s *b;
    vec3 contactPoint;
    vec3 contactNormal;
    float penetrationDepth;
} collision_contact_t;

/**
 * @brief Checks for collision between two AABB shapes and calculates collision details if they collide.
 *
 * @param rba [in] first rigidbody
 * @param rbb [in] second rigidbody
 * @param contact [out] the collision contact information if a collision is detected.
 * @return 1 if a collision is detected, 0 otherwise.
 */
int collision_collide_aabb(const struct rigidbody_s *rba, const struct rigidbody_s *rbb, collision_contact_t *contact);

#endif /* BP_COLLISION_H */
