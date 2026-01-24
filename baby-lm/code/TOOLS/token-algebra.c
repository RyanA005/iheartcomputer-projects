
/* token-algebra.c
 * this program takes two tokens and an operator as input
 * we will use the operator to either + or - each embedding value between the two token's embedding vectors
 * we then run a cosine similarity between the resultant vector and all other words in the vocab
 * the output there is theoretically the difference or addition of the two words
 * this is meant to demonstrate that hidden dimensions may contain meaning
 * unfortunately in such a small model, this is not as impressive as i would love it to be 
 * ie the king-man=queen-woman example.
 */

#include "../includes.c"

#define MINUS 0
#define PLUS 1

int main(int argc, char **argv) {

	if (argc != 4) {
		printf("usage ./%s <word> [+|-] <word>\n", argv[0]);
		exit(0);
	}

	Model m;
    Corpus c;

    load_corpus("suess.txt", &c);
	load_model("TRAINED/model.bin", &m);

	int op = strcmp(argv[2], "-") == 0 ? MINUS : PLUS;
	int w1, w2;

	if((w1 = lookup(argv[1], &c)) == 0) {
		printf("invalid word: %s\n", argv[1]);
		exit(1);
	}
	if((w2 = lookup(argv[3], &c)) == 0) {
		printf("invalid word: %s\n", argv[3]);
		exit(1);
	}

	printf("token id %d, %s\n", w1, argv[1]);
	printf("%c\n", op == MINUS ? '-' : '+');
	printf("token id %d, %s\n", w2, argv[3]);

	// do addition/subtraction
	float result[m.hidden_size];
	for (int i = 0; i < m.hidden_size; i++) {
		float a = m.W1[w1 * m.hidden_size + i];
		float b = m.W1[w2 * m.hidden_size + i];

		result[i] = (op == MINUS) ? (a - b) : (a + b);
	}
	
	// use cosine similarity to compare vector direction
	float best_sim = -1e9;
	int best_tok = -1;

	for (int tok = 1; tok < m.vocab_size; tok++) {
		float dot = 0.0f, na = 0.0f, nb = 0.0f;

		for (int i = 0; i < m.hidden_size; i++) {
			float v = m.W1[tok * m.hidden_size + i];
			dot += result[i] * v;
			na += result[i] * result[i];
			nb += v * v;
		}

		float sim = dot / (sqrtf(na) * sqrtf(nb) + 1e-8f);

		if (sim > best_sim) {
			if (tok == w1 || tok == w2) continue;
			best_sim = sim;
			best_tok = tok;
		}
	}

	printf("\nclosest token: %s - match: %f\n", c.vocab[best_tok], best_sim);	
}
