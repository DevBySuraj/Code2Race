export const CODE_PRESETS = {
  javascript: [
`const calculateSum = (arr) => {
  return arr.reduce((acc, val) => acc + val, 0);
};`,
`const fetchUserData = async (userId) => {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
};`,
`const getUniqueItems = (items) => {
  return [...new Set(items)];
};`
  ],
  python: [
`def find_max(numbers):
    max_val = numbers[0]
    for num in numbers:
        if num > max_val:
            max_val = num
    return max_val`,
`def is_palindrome(text):
    clean_text = "".join(c.lower() for c in text if c.isalnum())
    return clean_text == clean_text[::-1]`,
`class BankAccount:
    def __init__(self, owner, balance=0.0):
        self.owner = owner
        self.balance = balance`
  ],
  cpp: [
`#include <iostream>
int main() {
    std::cout << "KeyRacer!" << std::endl;
    return 0;
}`,
`#include <vector>
#include <numeric>
double get_average(const std::vector<int>& vec) {
    int sum = std::accumulate(vec.begin(), vec.end(), 0);
    return (double)sum / vec.size();
}`,
`#include <string>
struct Player {
    std::string name;
    int wpm;
    double accuracy;
};`
  ],
  css: [
`.card-container {
  display: flex;
  flex-direction: column;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
}`,
`@keyframes slide-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}`,
`.neon-text {
  color: #cdd6f4;
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.8);
}`
  ]
};

export function getRandomCodePreset(language) {
  const lang = language || 'javascript';
  const list = CODE_PRESETS[lang] || CODE_PRESETS.javascript;
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

export function getAllPresets() {
  const all = [];
  Object.keys(CODE_PRESETS).forEach(lang => {
    all.push(...CODE_PRESETS[lang]);
  });
  return all;
}

export function getRandomAnyPreset() {
  const keys = Object.keys(CODE_PRESETS);
  const randomLang = keys[Math.floor(Math.random() * keys.length)];
  return getRandomCodePreset(randomLang);
}
