#include <string.h>

#include "box_physics/buffer.h"
#include "rigidbody_internal.h"
#include "collision_internal.h"

#define SOLVER_VELOCITY_ITERATIONS 10
#define SOLVER_POSITIONAL_ITERATIONS 5

#define POSITIONAL_CORRECTION_PERCENT 0.2f
#define POSITIONAL_CORRECTION_SLOP 0.02f

static buffer_t *g_contactPairs;
static buffer_t *g_contacts;

int collision_collide_aabb(const rigidbody_t *rba, const rigidbody_t *rbb, collision_contact_t *contact) {
    float minPenetration = FLT_MAX;
    int axis;
    vec3 delta, overlap;

    shape_aabb_t shapeA, shapeB;
    memcpy(shapeA, rba->collisionShape, sizeof(shape_aabb_t));
    memcpy(shapeB, rbb->collisionShape, sizeof(shape_aabb_t));
    glm_vec3_add(shapeA[0], rba->position, shapeA[0]);
    glm_vec3_add(shapeB[0], rbb->position, shapeB[0]);
    glm_vec3_sub(shapeB[0], shapeA[0], delta);

    if (!shape_aabb_overlap(shapeA, shapeB, overlap)) {
        return 0; // No collision
    }

    minPenetration = overlap[0];
    glm_vec3_zero(contact->contactNormal);
    axis = 0;
    if (overlap[1] < minPenetration) {
        minPenetration = overlap[1];
        axis = 1;
    }
    if (overlap[2] < minPenetration) {
        minPenetration = overlap[2];
        axis = 2;
    }

    // Set correct normal direction
    contact->contactNormal[axis] = (delta[axis] > 0.0f) ? 1.0f : -1.0f;
    contact->penetrationDepth = minPenetration;

    glm_vec3_scale(contact->contactNormal, minPenetration * 0.5f, contact->contactPoint);
    glm_vec3_add(shapeA[0], contact->contactPoint, contact->contactPoint);

    return 1; // Collision detected
}

void collision_init(const size_t initialCapacity) {
    g_contactPairs = buffer_init(sizeof(collision_pair_t), initialCapacity);
    g_contacts = buffer_init(sizeof(collision_contact_t), initialCapacity);
}
void collision_deinit(void) {
    buffer_deinit(g_contactPairs);
    buffer_deinit(g_contacts);
}

void collision_broad_phase(const rigidbody_manager_t *manager) {
    size_t i, j;
    rigidbody_t *rbA, *rbB;
    collision_pair_t pair;

    buffer_clear(g_contactPairs);

    for (i = 0; i < manager->activeCount; i++) {
        rbA = &manager->rigidbodies[manager->activeIndices[i]];
        for (j = i + 1; j < manager->activeCount; j++) {
            rbB = &manager->rigidbodies[manager->activeIndices[j]];
            if (shape_aabb_overlap(rbA->worldBounding, rbB->worldBounding, NULL)) {
                pair.a = rbA;
                pair.b = rbB;
                buffer_add(g_contactPairs, &pair);
            }
        }
    }
}

void collision_narrow_phase(void) {
    size_t i;
    collision_pair_t *pair;
    collision_contact_t contact;

    buffer_clear(g_contacts);

    for (i = 0; i < g_contactPairs->count; i++) {
        pair = (collision_pair_t *)buffer_get(g_contactPairs, i);
        if (collision_collide_aabb(pair->a, pair->b, &contact)) {
            contact.a = pair->a;
            contact.b = pair->b;
            buffer_add(g_contacts, &contact);
        }
    }
}

void collision_contact_solver(struct rigidbody_manager_s *manager) {
    size_t i, j;
    for (i = 0; i < SOLVER_VELOCITY_ITERATIONS; i++) {
        for (j = 0; j < g_contacts->count; j++) {
            collision_contact_t *contact = (collision_contact_t *)buffer_get(g_contacts, j);
            collision_resolve_contact_velocity(contact);
        }
    }

    for (i = 0; i < SOLVER_POSITIONAL_ITERATIONS; i++) {
        for (j = 0; j < g_contacts->count; j++) {
            collision_contact_t *contact = (collision_contact_t *)buffer_get(g_contacts, j);
            collision_resolve_contact_position(contact);
        }
    }
}

void collision_resolve_contact_velocity(const collision_contact_t *contact) {
    vec3 relativeVelocity, impulse, frictionImpulse;
    float velAlongNormal, invMassA, invMassB, impulseScalar;
    float restitution = 0.4f, jt, mu = 0.4f, len;

    glm_vec3_sub(contact->b->velocity, contact->a->velocity, relativeVelocity);
    velAlongNormal = glm_vec3_dot(relativeVelocity, contact->contactNormal);

    if (velAlongNormal > 0) {
        return; // Objects are separating
    }

    invMassA = contact->a->invMass;
    invMassB = contact->b->invMass;

    impulseScalar = -(1 + restitution) * velAlongNormal / (invMassA + invMassB);
    glm_vec3_scale(contact->contactNormal, impulseScalar, impulse);
    rigidbody_add_impulse(contact->a, (vec3){impulse[0], impulse[1], impulse[2]});
    rigidbody_add_impulse(contact->b, impulse);

    if (contact->a->flags & RB_FLAG_DYNAMIC || contact->b->flags & RB_FLAG_DYNAMIC) {
        vec3 tangent;
        glm_vec3_scale(contact->contactNormal, velAlongNormal, tangent);
        glm_vec3_sub(relativeVelocity, tangent, tangent);
        glm_vec3_normalize(tangent);

        jt = -glm_vec3_dot(relativeVelocity, tangent) / (invMassA + invMassB);

        // Coulomb friction model
        if (fabsf(jt) > impulseScalar * mu) {
            jt = impulseScalar * mu * (jt < 0.0f ? -1.0f : 1.0f);
        }

        glm_vec3_scale(tangent, jt, frictionImpulse);
        len = glm_vec3_norm(tangent);
        len > 1e-6f ?glm_vec3_scale(tangent, 1.0f / len, tangent) : glm_vec3_zero(tangent);
        if (contact->a->flags & RB_FLAG_DYNAMIC) {
            rigidbody_add_impulse(contact->a, (vec3){-frictionImpulse[0], -frictionImpulse[1], -frictionImpulse[2]});
        }
        if (contact->b->flags & RB_FLAG_DYNAMIC) {
            rigidbody_add_impulse(contact->b, frictionImpulse);
        }
    }
}

void collision_resolve_contact_position(const collision_contact_t *contact) {
    vec3 correction, tmp;

    glm_vec3_scale(contact->contactNormal, fmaxf(contact->penetrationDepth - POSITIONAL_CORRECTION_SLOP, 0.0f) * POSITIONAL_CORRECTION_PERCENT, correction);
    glm_vec3_scale(correction, contact->a->invMass / (contact->a->invMass + contact->b->invMass), tmp);
    glm_vec3_sub(contact->a->position, tmp, contact->a->position);
    glm_vec3_scale(correction, contact->b->invMass / (contact->a->invMass + contact->b->invMass), tmp);
    glm_vec3_add(contact->b->position, tmp, contact->b->position);
}
