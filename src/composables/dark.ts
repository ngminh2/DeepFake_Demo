export const isDark = useDark({
  onChanged(dark: boolean) {
    localStorage.setItem('theme', dark ? 'dark' : 'light'); 
    if (dark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.body.setAttribute('arco-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.body.removeAttribute('arco-theme');
    }
  },
});

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  isDark.value = true;
} else if (savedTheme === 'light') {
  isDark.value = false;
}

export const toggleDark = useToggle(isDark);