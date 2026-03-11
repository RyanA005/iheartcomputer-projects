#ifndef BP_RIGIDBODY_INTERNAL_H
#define BP_RIGIDBODY_INTERNAL_H

#include "box_physics/rigidbody.h"

/**
 * @brief Manages a collection of Rigidbodies.
 */
typedef struct rigidbody_manager_s {
    rigidbody_t *rigidbodies;
    size_t *freeIndices;
    size_t *activeIndices;
    size_t capacity;
    size_t count;
    size_t freeCount;
    size_t activeCount;
} rigidbody_manager_t;

extern rigidbody_manager_t g_rigidbodyManager;

/**
 * @brief Initializes the rigidbody manager with a specified max capacity.
 * Allocates memory for the rigidbodies and index arrays.
 *
 * @param initialCapacity The max number of rigidbodies to support.
 */
void rigidbody_manager_init(size_t initialCapacity);

/**
 * @brief Deinitializes the rigidbody manager, freeing all allocated memory.
 *
 * @param manager The rigidbody manager to deinitialize.
 */
void rigidbody_manager_deinit(rigidbody_manager_t *manager);

/**
 * @brief Integrates the velocities of all active Rigidbodies in the manager over a time step.
 * Updates positions based on current velocities.
 *
 * @param manager The rigidbody manager containing the Rigidbodies to integrate.
 * @param deltaTime The time step to integrate over (in seconds).
 */
void rigidbody_manager_integrate_velocity(const rigidbody_manager_t *manager, float deltaTime);

/**
 * @brief Integrates the forces acting on all active Rigidbodies in the manager over a time step.
 * Updates velocities based on accumulated forces and torques.
 *
 * @param manager The rigidbody manager containing the Rigidbodies to integrate.
 * @param deltaTime The time step to integrate over (in seconds).
 */
void rigidbody_manager_integrate_force(const rigidbody_manager_t *manager, float deltaTime);

void rigidbody_manager_update_bounding_shapes(const rigidbody_manager_t *manager);

#endif /* BP_RIGIDBODY_INTERNAL_H */