// knownplusnoise.c
// adds small random noise to known latent vector

#include "includes.c"

int main() {

    srand(time(NULL));

    Model m;
    Dataset d;

    load_model("model.bin", &m);
    load_dataset("emojis.bin", &d);

    // pick a random emoji
	for(int i = 0; i < 4; i++) {
		int idx = rand() % d.count;
		float *img = &d.images[idx * IMAGESIZE];
		for(int j = 0; j < IMAGESIZE; j++) {
			img[j] += randf(-0.1f, 0.1f);
		}

		float image[IMAGESIZE];
		reconstruct(&m, img, image);

		char filename[32];
		snprintf(filename, 32, "known-plus-noise%d.bmp", i+1);

		save_bmp(filename, image);
	}

    return 0;
}
