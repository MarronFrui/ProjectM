//Search bar
const btn = document.getElementById('search-btn');
const input = document.getElementById('search-input');

btn.addEventListener('click', () => {
  input.classList.toggle('active');
  if(input.classList.contains('active')) input.focus();
});