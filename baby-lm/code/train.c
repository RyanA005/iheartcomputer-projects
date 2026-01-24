// train.c

#include "includes.c"

/*	training steps:
 * -----------------
 * load corpus
 * tokenize and build vocab
 * initialize model
 * 
 * training loop 
 *  -> pick a random position
 *  -> build context window
 *  -> attempt to predict position + 1 (forward phase)
 *  -> calculate loss (cross entropy)
 *  -> compute gradients and update weights (back propogate)
 *
 *  save model
 */

int main(int argc, char **argv) {

	Model m;
	Corpus c;

	int pos, idx, S = 100000; 
	int context[CONTEXT], target;
	float loss = 0, avg_loss = 0;

	srand(1234); // same seed for demo

	load_corpus("suess.txt", &c);
	init_model(&m, &c);

	if (argc == 2) S = atoi(argv[1]);
	printf("training running for %d steps\n", S);

	// training
	for (int step = 0; step < S; step++) {

		// pick random position in tokens
		pos = rand() % (c.token_count - 1);
		// fill context with token ids
		for(int i = 0; i < CONTEXT; i++) {
			idx = pos - (CONTEXT - 1 - i);
			context[i] = (idx >= 0) ? c.ids[idx] : 0;
		}
		target = c.ids[pos + 1];

		float h[HIDDEN]; // hidden activation
		float z[m.vocab_size]; // logits
		float p[m.vocab_size]; // probability
		
		// forward pass

		// hidden layer
		for (int i = 0; i < HIDDEN; i++) {
			/*
			 * for each hidden feature
			 *  start with bias
			 *  add the contribution from each context word
			 *  flatten with tanh to get nonlinear values in [-1, 1]
			 * store in h vector
			*/
			float sum = m.b1[i];
			for (int s = 0; s < CONTEXT; s++) {
				int tok = context[s];
				sum += m.W1[tok * HIDDEN + i]; // W1[tok][hidden+j]
			}

			h[i] = tanhf(sum); // captures how active each hidden feature is
		}
		// logits
		for (int i = 0; i < m.vocab_size; i++) {
			/*
			 * for each vocab word
			 *  run dot product to compare to h vector
			 * store each words "closeness" in z
			*/
			float sum = m.b2[i];
			for (int j = 0; j < HIDDEN; j++) {
				sum += h[j] * m.W2[j * m.vocab_size + i];
			}

			z[i] = sum;
		}
		// softmax turns logit value into probability
		softmax(z, p, m.vocab_size);

		// compute loss, aproaches 0 as target probability increases
		loss = -log(p[target]);
		avg_loss += loss;

		float dz[m.vocab_size]; // dz can be thought of as 'blame'
		for (int i = 0; i < m.vocab_size; i++)
			dz[i] = p[i] - (i == target ? 1.0f : 0.0f); 
			// subtract 1 from target, in gradient math this will indicate it needs to be pushed upwards

		float dh[HIDDEN]; // dh can be thought of as attribution of blame per hidden feature
		for (int j = 0; j < HIDDEN; j++) {
			float acc = 0.0f;
			for (int i = 0; i < m.vocab_size; i++) // dot product of dz(blame) and weight
				acc += m.W2[j * m.vocab_size + i] * dz[i];
			dh[j] = acc;
		}

		for (int j = 0; j < HIDDEN; j++) 
			// for each feature of each word, adjust based on (learning rate * feature activity * magnitude of error)
			for (int i = 0; i < m.vocab_size; i++)
				m.W2[j * m.vocab_size + i] -= LR * h[j] * dz[i]; 
				// since we subtracted 1 from the target error it is negative and has its weight increased

		for (int i = 0; i < m.vocab_size; i++) 
			// over training, common words will be target more often casuing their bias to increase
			m.b2[i] -= LR * dz[i];

		for (int j = 0; j < HIDDEN; j++) {
			float da = dh[j] * (1.0f - h[j] * h[j]); // da uses tanh derivative to adjust blame per feature input
			m.b1[j] -= LR * da; // b1 converges towards tendency for each feature to be active by default

			for (int s = 0; s < CONTEXT; s++) { // for each context word, adjust how strongly it activates each hidden feature
				int tok = context[s];
				m.W1[tok * HIDDEN + j] -= LR * da;
			}
		}

		if (step % 1000 == 0 && step > 0) { 
			avg_loss /= 1000;
			printf("training step: %d, average loss: %f\n", step, avg_loss);
			//printf("training step %d: loss: %f\n", step, loss);
			save_model("model.bin", &m);

			avg_loss = 0;
		}
	}

	printf("training complete after %d steps, final loss = %f\n", S, avg_loss/1000);
	return 0;
}
