const spinnerSvg = `
<svg width="40" height="24" viewBox="0 0 40 24" xmlns="http://www.w3.org/2000/svg">
  <style>
    .spinner_S1WN {animation: spinner_MGfb .8s linear infinite; animation-delay: -.8s}
    .spinner_Km9P {animation-delay: -.65s}
    .spinner_JApP {animation-delay: -.5s}
    @keyframes spinner_MGfb {93.75%,100%{opacity:.2}}
  </style>
  <circle class="spinner_S1WN" fill="white" cx="6" cy="12" r="4"/>
  <circle class="spinner_S1WN spinner_Km9P" fill="white" cx="18" cy="12" r="4"/>
  <circle class="spinner_S1WN spinner_JApP" fill="white" cx="30" cy="12" r="4"/>
</svg>
`;

document.addEventListener('click', async (e) => {
	if (e.target.matches('.load-more-link')) {
		e.preventDefault();

		const btn = e.target;
		const originalText = btn.textContent;
		btn.classList.add('loading');
		btn.innerHTML = spinnerSvg;

		try {
			const url = btn.href;
			const res = await fetch(url);

			const text = await res.text();
			const doc = new DOMParser().parseFromString(text, 'text/html');

			const newItems = doc.querySelectorAll('.landing-list .landing-item');
			const list = document.querySelector('.landing-list');
			newItems.forEach((item) => list.appendChild(item));

			const newBtn = doc.querySelector('.load-more');
			const oldBtn = document.querySelector('.load-more');

			if (newBtn) {
				oldBtn.replaceWith(newBtn);
			} else if (oldBtn) {
				oldBtn.remove();
			}
		} catch (err) {
			console.error('❌ Error loading more articles', err);
			btn.classList.remove('loading');
			btn.textContent = originalText;
		}
	}
});
