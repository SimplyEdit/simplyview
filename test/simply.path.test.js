import path from '../src/path.mjs'

test('fetch pointer', () => {
	const data = {
		foo: {
			bar: 'baz'
		}
	}
	const result = path.get(data, 'foo.bar')
	expect(result).toBe('baz');
});

test('fetch single pointer', () => {
	const data = {
		bar: 'baz'
	}
	const result = path.get(data, 'bar')
	expect(result).toBe('baz');
});
