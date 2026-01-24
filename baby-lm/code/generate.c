// generate.c

#include "includes.c"

/*	generation steps:
 * -----------------
 * load corpus
 * load model
 * 
 * generation loop 
 *  -> summarize context into hidden vector
 *  -> calculate logits across vocab
 *  -> convert to probabilities
 *  -> sample probability distribution and pick a word
 *  -> add new word to context and shift
 *
 */

int main(int argc, char **argv) {

	Model m;
    Corpus c;

	srand(1234); // same seed for demo

    load_corpus("suess.txt", &c);
	load_model("model.bin", &m);

    float temperature = 0.4;
    int steps = 100;

    int V = m.vocab_size;
    int H = m.hidden_size;

    float h[H]; // hidden embedding for context
    float z[V]; // logits
    float p[V]; // probabilities

    int context[CONTEXT];
	// fill seed context from CLI, pad front with 0
	for (int i = CONTEXT - 1; i >= 0; i--) {
		int j = i + 1;
		if (j < argc && argv[j] != NULL)
			context[i] = lookup(argv[j], &c); 
		else
			context[i] = 0;
	}
	// print seed context 
	for (int i = 0; i < CONTEXT; i++) if (context[i] != 0) printf("%s ", c.vocab[context[i]]);
	
	// feed forward for "steps"
    for (int t = 0; t < steps; t++) {

        // capture the hidden vector representing the context bag of words
        for (int j = 0; j < H; j++) {
            float sum = m.b1[j];
            for (int s = 0; s < CONTEXT; s++) {
                int tok = context[s];
                sum += m.W1[tok * H + j];
            }
            h[j] = tanhf(sum); // sqaushes hidden values within [-1, 1]
        }

        // preform dot product of hidden vector and each vocab word to get logit scores
        for (int k = 0; k < V; k++) {
            float sum = m.b2[k];
            for (int j = 0; j < H; j++)
                sum += h[j] * m.W2[j * V + k];
            z[k] = sum / temperature; // apply temp here, control "steepness" of distribution
        }

        // softmax to turn logits to probabilities
		softmax(z, p, V);
		// p now contains a probability value for each word in the vocab

		// sample over probabilities to choose and print next word
        int next = sample(p, V);
        printf("%s ", c.vocab[next]);

        // slide context window
        for (int i = 0; i < CONTEXT - 1; i++)
            context[i] = context[i + 1];
        context[CONTEXT - 1] = next;
    }

    printf("\n");
}
