// train.c
// training routine using MSE and standard backprop

#include "includes.c"

int main() {

    srand(time(NULL));

    Model m;
    Dataset d;

    init_model(&m);
    load_dataset("emojis.bin", &d);

    int steps = 3000;

    float latent[LATENT];
    float output[IMAGESIZE];
    float d_output[IMAGESIZE];
    float d_latent[LATENT];

    float avg_loss = 0;
    int idx = rand() % d.count;
    float *img = &d.images[idx * IMAGESIZE];
    float image[IMAGESIZE];
    save_bmp("original.bmp", img);

    for (int step = 0; step < steps; step++) {

        int idx = rand() % d.count;
        float *img = &d.images[idx * IMAGESIZE];

        // ---- forward ----
        encode(&m, img, latent);
        decode(&m, latent, output);

        // ---- loss + gradient ----
        float loss = 0;

        for (int i = 0; i < IMAGESIZE; i++) {
            float diff = output[i] - img[i];
            loss += diff * diff;

            float t = 2.0f * output[i] - 1.0f; // tanh(sum)
            float dout_dsum = 0.5f * (1.0f - t*t); // derivative
            float dL_dout = 2.0f * diff;
            d_output[i] = dL_dout * dout_dsum; // now dL/dsum
        }

        // ---- backprop decoder ----
        for (int j = 0; j < LATENT; j++)
            d_latent[j] = 0;

        for (int j = 0; j < LATENT; j++) {
            for (int i = 0; i < IMAGESIZE; i++) {
                int w2_idx = j * IMAGESIZE + i;

                float grad = d_output[i] * latent[j];
                float w = m.w2[w2_idx];

                d_latent[j] += d_output[i] * w;
                m.w2[w2_idx] -= LR * grad;
            }
        }

        for (int i = 0; i < IMAGESIZE; i++)
            m.b2[i] -= LR * d_output[i];

        // ---- backprop encoder ----
        for (int j = 0; j < LATENT; j++) {
            float dz = d_latent[j] * (1 - latent[j] * latent[j]);

            for (int i = 0; i < IMAGESIZE; i++) {
                int w1_idx = i * LATENT + j;
                float grad = dz * img[i];
                m.w1[w1_idx] -= LR * grad;
            }

            m.b1[j] -= LR * dz;
        }

        avg_loss += loss;
        if (step % 1000 == 0) {
            if (step != 0) printf("step %d loss %f\n", step, avg_loss / 1000 / IMAGESIZE);
            else printf("initial loss %f\n", loss / IMAGESIZE);

            char filename[16];
            snprintf(filename, 16, "%d.bmp", step);
            reconstruct(&m, img, image);
            save_bmp(filename, image);
            avg_loss = 0;
        }
    }

    save_model("model.bin", &m);

    return 0;
}
