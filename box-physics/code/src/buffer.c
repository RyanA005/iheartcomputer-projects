#include <stdlib.h>
#include <string.h>

#include "box_physics/buffer.h"

buffer_t * buffer_init(const size_t elementSize, const size_t initialCapacity) {
    buffer_t *buffer = (buffer_t *)malloc(sizeof(buffer_t));
    if (!buffer) {
        return NULL;
    }

    buffer->data = malloc(elementSize * initialCapacity);
    if (!buffer->data) {
        free(buffer);
        return NULL;
    }

    buffer->elementSize = elementSize;
    buffer->capacity = initialCapacity;
    buffer->count = 0;
    return buffer;
}

void buffer_deinit(buffer_t *buffer) {
    if (buffer) {
        free(buffer->data);
        free(buffer);
    }
}

int buffer_resize(buffer_t *buffer, const size_t newCapacity) {
    if (!buffer || newCapacity == 0) {
        return 0;
    }

    void *newData = realloc(buffer->data, buffer->elementSize * newCapacity);
    if (!newData) {
        return 0;
    }

    buffer->data = newData;
    buffer->capacity = newCapacity;
    if (buffer->count > newCapacity) {
        buffer->count = newCapacity; // Discard excess elements
    }
    return 1;
}

int buffer_add(buffer_t *buffer, const void *element) {
    if (!buffer || !element) {
        return 0;
    }

    if (buffer->count >= buffer->capacity) {
        // Need to resize (double the capacity)
        if (!buffer_resize(buffer, buffer->capacity * 2)) {
            return 0; // Failed to resize
        }
    }

    // Copy the element data into the buffer
    void *target = (char *)buffer->data + (buffer->count * buffer->elementSize);
    memcpy(target, element, buffer->elementSize);
    buffer->count++;
    return 1;
}

int buffer_new(buffer_t *buffer, void **outElement) {
    if (!buffer || !outElement) {
        return 0;
    }

    if (buffer->count >= buffer->capacity) {
        // Need to resize (double the capacity)
        if (!buffer_resize(buffer, buffer->capacity * 2)) {
            return 0; // Failed to resize
        }
    }

    *outElement = (char *)buffer->data + (buffer->count * buffer->elementSize);
    buffer->count++;
    return 1;
}

void *buffer_get(buffer_t *buffer, const size_t index) {
    if (!buffer || index >= buffer->count) {
        return NULL;
    }

    return (char *)buffer->data + (index * buffer->elementSize);
}

void buffer_clear(buffer_t *buffer) {
    if (buffer) {
        buffer->count = 0;
    }
}
