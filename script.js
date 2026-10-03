const album = document.querySelector('#photo-album');
if (album) {
  const buttons = [...document.querySelectorAll('[data-album-direction]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateButtons = () => {
    buttons[0].disabled = album.scrollLeft <= 2;
    buttons[1].disabled = album.scrollLeft >= album.scrollWidth - album.clientWidth - 2;
  };
  const move = direction => album.scrollBy({left: direction * (album.clientWidth * .75), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  buttons.forEach(button => button.addEventListener('click', () => move(Number(button.dataset.albumDirection))));
  album.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  album.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) || event.ctrlKey) return;
    const canMove = event.deltaY > 0 ? album.scrollLeft < album.scrollWidth - album.clientWidth - 2 : album.scrollLeft > 2;
    if (canMove) { event.preventDefault(); album.scrollLeft += event.deltaY; }
  }, {passive: false});
  album.addEventListener('scroll', updateButtons, {passive: true});
  window.addEventListener('resize', updateButtons);
  album.querySelectorAll('img').forEach(image => image.addEventListener('load', updateButtons));
  const observer = new ResizeObserver(updateButtons);
  observer.observe(album);
  album.querySelectorAll('figure').forEach(figure => observer.observe(figure));
  updateButtons();
}
const copyEmail = document.querySelector('#copy-email');
if (copyEmail) copyEmail.addEventListener('click', async () => {
  const email = document.querySelector('#contact-address').textContent;
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(email);
    status.textContent = '邮箱已复制，可以去写信了。';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#contact-address'));
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    status.textContent = '邮箱已选中，请按 Ctrl+C（或长按）复制。';
  }
});
