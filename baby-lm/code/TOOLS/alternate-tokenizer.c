
/* this is the alternate tokenizer for baby-lm
 * it should allow for limited punctuation including . , ? ! as well as newlines
 * the no punctuation version lives in includes
 */

void load_corpus(char *path, Corpus *c) {

	int cap = 1000, max_tok_size = 50;
	int ch, c_count = 0;
	char **tokens;
	char buf[max_tok_size];

	// ensure corpus counters are initialized to avoid uninitialized writes
	c->token_count = 0;
	c->vocab_count = 0;
	
	// load corpus from path
	FILE * f = fopen(path, "r");
	if (!f) { perror("cannot read corpus"); exit(1); }

	tokens = malloc(cap * sizeof(char*));
	while ((ch = getc(f)) != EOF) {

		if (c->token_count >= cap - 1) {
			cap *= 2;
			tokens = realloc(tokens, cap * sizeof(char *));
			if (!tokens) exit(1);
		}

		if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '-' || ch == '\'') {
			if (ch >= 'A' && ch <= 'Z') ch += 'a' - 'A';
			if (c_count < max_tok_size - 1) buf[c_count++] = ch;
		} else {
			if (c_count > 0) {
				buf[c_count] = '\0';
				tokens[c->token_count++] = strdup(buf);
				c_count = 0;
			} if (ch == '\n' || ch == ',' || ch == '.' || ch == '!'  || ch == '?') {
				buf[0] = ch;
				buf[1] = '\0';
				tokens[c->token_count++] = strdup(buf);
			}
		}
	}
	
	fclose(f);
	
	// add unique tokens to vocab
	cap = 1000;
	c->vocab = malloc(cap * sizeof(char*));
	c->vocab[0] = "?"; // unknown
	c->vocab_count = 1;
	for (int i = 0; i < c->token_count; i++) {
		int found = 0;

		for (int j = 0; j < c->vocab_count; j++) {
			if (strcmp(tokens[i], c->vocab[j]) == 0) {
				found = 1;
				break;
			}
		}

		if (found == 0) {
			if (c->vocab_count == cap) {
				cap *= 2;
				c->vocab = realloc(c->vocab, cap * sizeof(char*));
			}
			c->vocab[c->vocab_count++] = strdup(tokens[i]);
		}
	}	
	// create ids array to convert tokens[index] = "some string" -> ids[index] = token index
	c->ids = malloc(sizeof(int) * c->token_count);
	for (int i = 0; i < c->token_count; i++) {
		int found = 0;
		for (int j = 0; j < c->vocab_count; j++) {
			if (strcmp(tokens[i], c->vocab[j]) == 0) {
				c->ids[i] = j;
				found = 1;
				break;
			}
		}
		if (!found) c->ids[i] = 0; // null token, maps to '?'
	}
	printf("corpus loaded: %d tokens, %d vocab\n", c->token_count, c->vocab_count);
}
