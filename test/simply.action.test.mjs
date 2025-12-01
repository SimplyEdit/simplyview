import { actions } from '../src/action.mjs'

describe('actions can', () => {
	it('catch exceptions', (done) => {
		let errors = []
		const app = {
			hooks: {
				error: function(err) {
					errors.push(err.message)
				}
			}
		}
		const testActions = actions({
			app, 
			actions: {
				async willThrow() {
					throw new Error('throw!')
				},
				willNotThrow() {
					return 'ok'
				}
			}
		})
		expect(testActions.willNotThrow()).toBe('ok')
		testActions.willThrow().then(result => {
			expect(errors.length).toBe(1)
			if (errors.length) {
				expect(errors[0]).toBe('throw!')
			}
			done()
		})
	})
})