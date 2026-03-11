#ifndef BP_COLLISION_INTERNAL_H
#define BP_COLLISION_INTERNAL_H

#include "box_physics/collision.h"

struct rigidbody_s;
struct rigidbody_manager_s;

typedef struct collision_pair_s {
    struct rigidbody_s *a;
    struct rigidbody_s *b;
} collision_pair_t;

void collision_init(size_t initialCapacity);
void collision_deinit(void);

void collision_broad_phase(const struct rigidbody_manager_s *manager);

void collision_narrow_phase(void);

void collision_contact_solver(struct rigidbody_manager_s *manager);

void collision_resolve_contact_velocity(const collision_contact_t *contact);

void collision_resolve_contact_position(const collision_contact_t *contact);

#endif