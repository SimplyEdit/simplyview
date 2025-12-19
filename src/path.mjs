const path = {
	get(dataset, pointer) {
		if (typeof pointer !== 'string') {
			return pointer
		}
		if (!pointer) {
			return dataset
		}
		pointer.split('.').reduce(function(acc, name) {
	        return (acc && acc[name] ? acc[name] : null)
	    }, dataset)
	    return dataset
	},
	set: function(dataset, pointer, value) {
		const parent = path.get(dataset, path.parent(pointer))
		parent[path.pop(pointer)] = value
	},
	pop: function(pointer) {
		return pointer.split('.').pop()
	},
	push: function(pointer, name) {
		return (pointer ? pointer + '.' : '') + name
	},
	parent: function(dataset, pointer) {
		const names = pointer.split('.')
		names.pop()
		return names.join('.')
	},
	parents: function(dataset, pointer) {
		let result = []
		while (pointer) {
			pointer = path.parent(pointer)
			result.unshift(pointer)
		}
	}
}

export default path