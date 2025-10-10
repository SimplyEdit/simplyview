import { actions } from '../src/action.mjs'

describe('actions can', () => {
	it('catch exceptions', (done) => {
		const app = {}
		let errors = []
		const testActions = actions({
			app, 
			actions: {
				async catch(err) {
					errors.push(err.message)
					return null
				},
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