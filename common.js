function applyI18n(node = document) {
	for (const v of node.querySelectorAll('[data-i18n]'))
		v.innerText = browser.i18n.getMessage(v.dataset['i18n'])
}

async function getAllRegistrations(tabId) {
	const uniqueSet = new Set()
	return [].concat(...await browser.tabs.executeScript(tabId, {
		code: 'getAllRegistrations()',
		runAt: 'document_start',
		allFrames: true,
	})).filter(reg => {
		const key = (reg.pending ? 1 : 0) + reg.url + '\n' + reg.scope
		if (uniqueSet.has(key)) return false
		uniqueSet.add(key)
		return true
	})
}

class SimpleStorage {
	constructor(objectStoreName) {
		this.objectStoreName = objectStoreName
	}

	static request(r) {
		return new Promise((resolve, reject) => {
			r.addEventListener('success', () => resolve(r.result))
			r.addEventListener('error', () => reject(r.error))
			r.addEventListener('abort', () => reject(abortError()))
		})
	}

	static async create(databaseName = 'simpleStorage', {
		version = undefined,
		objectStoreName = 'simpleStorage',
		migrate = async () => { },
		autoIncrement = false,
	} = {}) {
		const that = new this(objectStoreName)
		const request = indexedDB.open(databaseName, version)
		request.onupgradeneeded = async (event) => {
			const db = request.result
			that.currentObjectStore = event.oldVersion ?
				request.transaction.objectStore(objectStoreName) :
				db.createObjectStore(objectStoreName, { autoIncrement })
			await migrate()
		}
		that.database = await SimpleStorage.request(request)
		that.currentObjectStore = undefined
		return that
	}

	async transaction(mode, fn) {
		if (this.currentObjectStore) {
			if (this.currentObjectStore.transaction.mode == 'readonly'
				&& mode == 'readwrite')
				throw readOnlyError()
			return await fn()
		}
		else {
			this.currentObjectStore = this.objectStore(mode)
			try {
				return await fn()
			} finally { this.currentObjectStore = undefined }
		}
	}

	objectStore(mode) {
		if (this.currentObjectStore) return this.currentObjectStore
		return this.database.transaction(this.objectStoreName, mode)
			.objectStore(this.objectStoreName)
	}

	get(key) {
		return SimpleStorage.request(this.objectStore('readonly').get(key))
	}

	getAll(range) {
		return SimpleStorage.request(this.objectStore('readonly').getAll(range))
	}

	keys() {
		return SimpleStorage.request(this.objectStore('readonly').getAllKeys())
	}

	set(key, value) {
		return SimpleStorage.request(this.objectStore('readwrite').put(value, key))
	}

	async insert(key, fn) {
		const store = this.objectStore('readwrite')
		const cursor = await SimpleStorage.request(store.openCursor(key))
		if (cursor) return cursor.value
		const value = fn()
		await store.add(value, key)
		return value
	}

	delete(key) {
		return SimpleStorage.request(this.objectStore('readwrite').delete(key))
	}

	clear() {
		return SimpleStorage.request(this.objectStore('readwrite').clear())
	}
}

const notificationStorage = SimpleStorage.create('notification', { autoIncrement: true })