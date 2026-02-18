// latent_sample.c
// computes latent mean and deviations and samples from them to generate sample vectors in the latent space

#include "includes.c"

void compute_latent_stats(Model *m, Dataset *d, float *mean, float *std) {

    float latent[LATENT];

    // init
    for (int j = 0; j < LATENT; j++) {
        mean[j] = 0;
        std[j] = 0;
    }

    // mean
    for (int n = 0; n < d->count; n++) {
        float *img = &d->images[n * IMAGESIZE];
        encode(m, img, latent);

        for (int j = 0; j < LATENT; j++)
            mean[j] += latent[j];
    }

    for (int j = 0; j < LATENT; j++)
        mean[j] /= d->count;

    // variance
    for (int n = 0; n < d->count; n++) {
        float *img = &d->images[n * IMAGESIZE];
        encode(m, img, latent);

        for (int j = 0; j < LATENT; j++) {
            float diff = latent[j] - mean[j];
            std[j] += diff * diff;
        }
    }

    for (int j = 0; j < LATENT; j++) {
        std[j] = sqrtf(std[j] / d->count);
        if (std[j] < 0.01f) std[j] = 0.01f;
    }
}

int main() {

    srand(time(NULL));

    Model m;
    Dataset d;

    load_model("model.bin", &m);
    load_dataset("emojis.bin", &d);

    float mean[LATENT];
    float std[LATENT];

    compute_latent_stats(&m, &d, mean, std);

    // sample random latent
	for(int i = 0; i < 4; i++) {
		float latent[LATENT];
		for (int j = 0; j < LATENT; j++) {
			latent[j] = mean[j] + gauss() * std[j] * 0.7f;
		}

		float image[IMAGESIZE];
		decode(&m, latent, image);

		char filename[16];
		snprintf(filename, 16, "avg-latent%d.bmp", i+1);

		save_bmp(filename, image);
	}

    return 0;
}
