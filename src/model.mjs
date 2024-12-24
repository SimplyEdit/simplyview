import {signal, effect, batch} from './state.mjs'

/**
 * This class implements a pluggable data model, where you can
 * add effects that are run only when either an option for that
 * effect changes, or when an effect earlier in the chain of
 * effects changes.
 */
class SimplyModel {

	/**
	 * Creates a new datamodel, with a state property that contains
	 * all the data passed to this constructor
	 * @param state	Object with all the data for this model
	 */
	constructor(state) {
		this.state = signal(state)
		if (!this.state.options) {
			this.state.options = {}
		}
		this.effects = [{current:state.data}]
		this.view = signal(state.data)
	}

	/**
	 * Adds an effect to run whenever a signal it depends on
	 * changes. this.state is the usual signal.
	 * The `fn` function param is not itself an effect, but must return
	 * and effect function. `fn` takes one param, which is the data signal.
	 * This signal will always have at least a `current` property.
	 * The result of the effect function is pushed on to the this.effects
	 * list. And the last effect added is set as this.view
	 */
	addEffect(fn) {
		const dataSignal = this.effects[this.effects.length-1]
		this.view = fn.call(this, dataSignal)
		this.effects.push(this.view)
	}
}

export function model(options) {
	return new SimplyModel(options)
}

export function sort(options={}) {
	return function(data) {
		// initialize the sort options, only gets called once
		this.state.options.sort = Object.assign({
			direction: 'asc',
			sortBy: null,
			sortFn: ((a,b) => {
				const sort = this.state.options.sort
				const sortBy = sort.sortBy
				if (!sort.sortBy) {
					return 0
				}
				const larger = sort.direction == 'asc' ? 1 : -1
				const smaller = sort.direction == 'asc' ? -1 : 1
				if (typeof a?.[sortBy] === 'undefined') {
					if (typeof b?.[sortBy] === 'undefined') {
						return 0
					}
					return larger
				}
				if (typeof b?.[sortBy] === 'undefined') {
					return smaller
				}
				if (a[sortBy]<b[sortBy]) {
					return smaller
				} else if (a[sortBy]>b[sortBy]) {
					return larger
				} else {
					return 0
				}
			})
		}, options);
		// then return the effect, which is called when
		// either the data or the sort options change
		return effect(() => {
			const sort = this.state.options.sort
			if (sort?.sortBy && sort?.direction) {
				return data.current.toSorted(sort?.sortFn)
			}
			return data.current
		})
	}
}

export function paging(options={}) {
	return function(data) {
		// initialize the paging options
		this.state.options.paging = Object.assign({
			page: 1,
			pageSize: 20,
			max: 1
		}, options)
		return effect(() => {
			return batch(() => {
				const paging = this.state.options.paging
				if (!paging.pageSize) {
					paging.pageSize = 20
				}
				paging.max = Math.ceil(this.state.data.length / paging.pageSize)
				paging.page = Math.max(1, Math.min(paging.max, paging.page))

				const start = (paging.page-1) * paging.pageSize
				const end = start + paging.pageSize
				return data.current.slice(start, end)
			})
		})
	}
}

export function filter(options) {
	if (!options?.name || typeof options.name!=='string') {
		throw new Error('filter requires options.name to be a string')
	}
	if (!options.matches || typeof options.matches!=='function') {
		throw new Error('filter requires options.matches to be a function')
	}
	return function(data) {
		this.state.options[options.name] = options
		return effect(() => {
			if (this.state.options[options.name].enabled) {
				return data.filter(this.state.options.matches)
			}
		})
	}
}

export function columns(options={}) {
	if (!options
		|| typeof options!=='object'
		|| Object.keys(options).length===0) {
		throw new Error('columns requires options to be an object with at least one property')
	}
	return function(data) {
		this.state.options.columns = options
		return effect(() => {
			return data.current.map(input => {
				let result = {}
				for (let key of Object.keys(this.state.options.columns)) {
					if (!this.state.options.columns[key].hidden) {
						result[key] = input[key]
					}
				}
				return result
			})
		})
	}
}