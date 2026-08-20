/** A few realistic errors for the empty-state "try one" chips. */
export const SAMPLES = [
  {
    label: 'TypeError · undefined',
    lang: 'JavaScript',
    text: `Uncaught TypeError: Cannot read properties of undefined (reading 'name')
    at renderProfile (app.js:42:19)
    at HTMLButtonElement.<anonymous> (app.js:88:5)`,
  },
  {
    label: 'React · too many renders',
    lang: 'React',
    text: `Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
    at renderWithHooks (react-dom.development.js:15012:17)
    at Counter (Counter.jsx:9:31)`,
  },
  {
    label: 'ModuleNotFound',
    lang: 'Python',
    text: `Traceback (most recent call last):
  File "main.py", line 3, in <module>
    import requests
ModuleNotFoundError: No module named 'requests'`,
  },
  {
    label: 'Cannot find module',
    lang: 'Node.js',
    text: `Error: Cannot find module 'express'
Require stack:
- /app/server.js
    at Function._resolveFilename (node:internal/modules/cjs/loader:1145:15)`,
  },
  {
    label: 'KeyError',
    lang: 'Python',
    text: `Traceback (most recent call last):
  File "app.py", line 12, in get_user
    return data['email']
KeyError: 'email'`,
  },
  {
    label: 'NullPointerException',
    lang: 'Java',
    text: `Exception in thread "main" java.lang.NullPointerException: Cannot invoke "String.length()" because "name" is null
    at com.example.App.greet(App.java:15)
    at com.example.App.main(App.java:8)`,
  },
  {
    label: 'Code Doctor · Python',
    lang: 'Python',
    text: `def calculate_average(numbers):
    total = 0
    for i in range(len(numbers) + 1):
        total += numbers[i]
    return total / len(numbers)

students = [
    {"name": "Rahul", "marks": [80, 75, 90]},
    {"name": "Vedant", "marks": [85, 91, 87]},
]

student = students[2]
average = calculate_average(student["marks"])
print("Grade:", student["grade"])`,
  },
]
