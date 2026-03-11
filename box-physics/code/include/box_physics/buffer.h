#ifndef BP_BUFFER_H
#define BP_BUFFER_H

typedef struct buffer_s {
    void *data;
    size_t elementSize;
    size_t capacity;
    size_t count;
} buffer_t;

/**
 * @brief Initializes a buffer with the specified element size and initial capacity.
 * Allocates memory for the buffer data.
 *
 * @param elementSize The size of each element in bytes.
 * @param initialCapacity The initial number of elements the buffer can hold.
 * @return A pointer to the initialized buffer, or NULL on failure.
 */
buffer_t* buffer_init(size_t elementSize, size_t initialCapacity);

/**
 * @brief Deinitializes the buffer, freeing all allocated memory.
 *
 * @param buffer The buffer to deinitialize. Must not be NULL.
 */
void buffer_deinit(buffer_t *buffer);

/**
 * @brief Resizes the buffer to a new capacity. If the new capacity is smaller than the current count,
 * excess elements will be discarded.
 *
 * @param buffer The buffer to resize. Must not be NULL.
 * @param newCapacity The new capacity in number of elements.
 * @return 1 on success, 0 on failure.
 */
int buffer_resize(buffer_t *buffer, size_t newCapacity);

/**
 * @brief Adds an element to the end of the buffer. Resizes the buffer if necessary.
 *
 * @param buffer The buffer to add the element to. Must not be NULL.
 * @param element Pointer to the element data to add. Must not be NULL.
 * @return 1 on success, 0 on failure.
 */
int buffer_add(buffer_t *buffer, const void *element);

/**
 * @brief Retrieves a pointer to the element at the next slot in the buffer and increments the count. Resizes the buffer if necessary.
 *
 * @param buffer The buffer to retrieve the element from. Must not be NULL.
 * @param outElement Pointer to store the address of the retrieved element. Must not be NULL.
 * @return 1 on success, 0 on failure.
 */
int buffer_new(buffer_t *buffer, void **outElement);

/**
 * @brief Retrieves a pointer to the element at the specified index in the buffer.
 *
 * @param buffer The buffer to retrieve the element from. Must not be NULL.
 * @param index The index of the element to retrieve. Must be less than buffer->count.
 * @return A pointer to the element at the specified index, or NULL if the index is out of bounds.
 */
void *buffer_get(buffer_t *buffer, size_t index);

/**
 * @brief Removes all elements from the buffer and resets the count to zero. Does not change the capacity or free memory.
 *
 * @param buffer The buffer to clear. Must not be NULL.
 */
void buffer_clear(buffer_t *buffer);

#endif /* BP_BUFFER_H */