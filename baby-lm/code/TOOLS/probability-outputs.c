
/* probability-outputs.c
 * this program takes command line input of tokens to fill a context, more will be ignored
 * it then runs the typical forward pass as if we are generating but it prints the top N options and their probabilities
 * i find this a very usefull tool for understanding the model at a fundemental level
 */

#include "../includes.c"

#define N 4
#define S 10

int main(int argc, char **argv) {

	Model m;
    Corpus c;

	srand(1234);

    load_corpus("suess.txt", &c);
	load_model("TRAINED/model.bin", &m);

    float temperature = 0.9;

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
	
	// just run a few times
    for (int t = 0; t < S; t++) {

        // capture the hidden vector representing the context bag of words
        for (int j = 0; j < H; j++) {
            float sum = m.b1[j];
            for (int s = 0; s < CONTEXT; s++) {
                int tok = context[s];
                sum += m.W1[tok * H + j];
            }
            h[j] = tanhf(sum);
        }


        // preform dot product of hidden and each vocab word to get logit scores
        for (int k = 0; k < V; k++) {
            float sum = m.b2[k];
            for (int j = 0; j < H; j++)
                sum += h[j] * m.W2[j * V + k];
            z[k] = sum / temperature; // apply temp here, control "steepness" of distribution
        }

        // softmax to turn logits to probabilities
		softmax(z, p, V);
		

		// print highest probability words
		int *topN = calloc(N, sizeof(int));
		printf("\n");
		printf("given context: \n \"");
		for (int i = 0; i < CONTEXT; i++) printf("%s ", c.vocab[context[i]]);
		printf("\" \n");
		for (int i = 0; i < c.vocab_count; i++) {
			for (int j = 0; j < N; j++) {
				if (p[i] > p[topN[j]]) { topN[j] = i; break; }
			}
		}
		printf("top %d choices: \n", N);
		for (int i = 0; i < N; i++) printf(" %s - %f\n", c.vocab[topN[i]], p[topN[i]]);


		// sample over probabilities to choose and print next word
        int next = sample(p, V);
        printf("selected: %s \n", c.vocab[next]);

        // slide context window
        for (int i = 0; i < CONTEXT - 1; i++)
            context[i] = context[i + 1];
        context[CONTEXT - 1] = next;
    }

    printf("\n");
}
