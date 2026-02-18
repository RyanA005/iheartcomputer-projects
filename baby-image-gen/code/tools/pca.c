// pca.c
// extracts principle axes into a bin file

#include "includes.c"

#define PCA_K 15   // number of components to export

// ----------------- basic math -----------------

float dot(float *a, float *b, int n) {
    float s = 0;
    for (int i = 0; i < n; i++)
        s += a[i] * b[i];
    return s;
}

void normalize(float *v, int n) {
    float norm = sqrtf(dot(v, v, n)) + 1e-8f;
    for (int i = 0; i < n; i++)
        v[i] /= norm;
}

void matvec(float *A, float *x, float *out, int D) {
    for (int i = 0; i < D; i++) {
        float s = 0;
        for (int j = 0; j < D; j++)
            s += A[i * D + j] * x[j];
        out[i] = s;
    }
}

// ----------------- PCA helpers -----------------

void compute_mean(float *data, int N, int D, float *mean) {
    for (int j = 0; j < D; j++)
        mean[j] = 0;

    for (int i = 0; i < N; i++) {
        float *row = &data[i * D];
        for (int j = 0; j < D; j++)
            mean[j] += row[j];
    }

    for (int j = 0; j < D; j++)
        mean[j] /= N;
}

void center_data(float *data, int N, int D, float *mean) {
    for (int i = 0; i < N; i++) {
        float *row = &data[i * D];
        for (int j = 0; j < D; j++)
            row[j] -= mean[j];
    }
}

void compute_covariance(float *data, int N, int D, float *cov) {
    for (int i = 0; i < D * D; i++)
        cov[i] = 0;

    for (int n = 0; n < N; n++) {
        float *row = &data[n * D];
        for (int i = 0; i < D; i++) {
            for (int j = 0; j < D; j++) {
                cov[i * D + j] += row[i] * row[j];
            }
        }
    }

    float scale = 1.0f / (N - 1);
    for (int i = 0; i < D * D; i++)
        cov[i] *= scale;
}

void power_iteration(float *cov, int D, float *vec, int iters) {
    float *tmp = malloc(sizeof(float) * D);

    for (int i = 0; i < D; i++)
        vec[i] = randf(-1, 1);

    normalize(vec, D);

    for (int k = 0; k < iters; k++) {
        matvec(cov, vec, tmp, D);
        normalize(tmp, D);

        for (int i = 0; i < D; i++)
            vec[i] = tmp[i];
    }

    free(tmp);
}

void deflate(float *cov, float *vec, int D) {
    float *tmp = malloc(sizeof(float) * D);
    matvec(cov, vec, tmp, D);
    float lambda = dot(vec, tmp, D);

    for (int i = 0; i < D; i++) {
        for (int j = 0; j < D; j++) {
            cov[i * D + j] -= lambda * vec[i] * vec[j];
        }
    }

    free(tmp);
}

void pca(float *data, int N, int D, int K, float *components) {
    float *mean = malloc(sizeof(float) * D);
    float *cov = malloc(sizeof(float) * D * D);
    float *vec = malloc(sizeof(float) * D);

    compute_mean(data, N, D, mean);
    center_data(data, N, D, mean);
    compute_covariance(data, N, D, cov);

    for (int k = 0; k < K; k++) {
        power_iteration(cov, D, vec, 100);

        for (int i = 0; i < D; i++)
            components[k * D + i] = vec[i];

        deflate(cov, vec, D);
        printf("computed component %d\n", k);
    }

    free(mean);
    free(cov);
    free(vec);
}

// ----------------- main program -----------------

int main() {
    srand(time(NULL));

    Model m;
    Dataset d;

    load_model("model.bin", &m);
    load_dataset("emojis.bin", &d);

    int N = d.count;
    int D = LATENT;
    int K = PCA_K;

    printf("encoding %d emojis into latent space...\n", N);

    float *latents = malloc(sizeof(float) * N * D);

    for (int i = 0; i < N; i++) {
        encode(&m, &d.images[i * IMAGESIZE], &latents[i * D]);
    }

    float *components = malloc(sizeof(float) * K * D);

    printf("running PCA...\n");
    pca(latents, N, D, K, components);

    FILE *f = fopen("pca.bin", "wb");
    fwrite(components, sizeof(float), K * D, f);
    fclose(f);

    printf("wrote pca.bin with %d components\n", K);

    free(latents);
    free(components);

    return 0;
}
