applyI18n()

for (const input of document.querySelectorAll('[data-key]')) {
	const key = input.dataset.key
	browser.storage.local.get(key).then(({ [key]: value }) => {
		if (input.type === 'checkbox')
			input.checked = !!value
		else
			input.value = '' + value
	})
	input.addEventListener('change', () => {
		if (!input.checkValidity()) return
		let value
		if (input.type === 'number') {
			value = (!input.required && !input.value) ? '' : Number(input.value)
		} else if (input.type === 'checkbox')
			value = input.checked
		else value = input.value
		void browser.storage.local.set({ [key]: value })
	})
	const placeholderI18n = input.dataset['placeholderI18n']
	if (placeholderI18n) input.placeholder = browser.i18n.getMessage(placeholderI18n)
}