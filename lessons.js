var lessons = [
{title:"مقدمه پایتون",desc:"پایتون چیست و چرا یاد بگیریم؟",html:'<h3>🐍 پایتون چیست؟</h3><p>پایتون یک زبان برنامه‌نویسی سطح بالا، تفسیری و شی‌گرا است که توسط گیدو ون روسوم در سال ۱۹۹۱ ساخته شد.</p><h3>✅ مزایا:</h3><ul><li>سادگی و خوانایی بالا</li><li>کتابخانه‌های فراوان</li><li>استفاده در هوش مصنوعی</li><li>رایگان و متن‌باز</li></ul><h3>💻 اولین برنامه:</h3><pre>print("سلام دنیا!")</pre>'},
{title:"نصب پایتون",desc:"نصب روی کامپیوتر و موبایل",html:'<h3>💻 نصب روی کامپیوتر:</h3><ul><li>برو به python.org</li><li>دانلود و نصب کن</li><li>تیک Add to PATH را بزن</li></ul><h3>📱 نصب روی موبایل:</h3><ul><li>اندروید: Pydroid 3</li><li>آیفون: Pythonista</li></ul><h3>✏️ اولین کد:</h3><pre>print("سلام!")\nprint(2 + 3)</pre>'},
{title:"متغیرها",desc:"ذخیره داده در متغیرها",html:'<h3>📦 متغیر چیست؟</h3><p>ظرفی برای ذخیره داده.</p><pre>name = "علی"\nage = 25\nheight = 1.75\nis_student = True</pre><h3>🔢 انواع داده:</h3><ul><li>int: عدد صحیح</li><li>float: عدد اعشاری</li><li>str: متن</li><li>bool: درست/غلط</li></ul><h3>🔄 تبدیل نوع:</h3><pre>a = "25"\nb = int(a)\nprint(b + 5)   # 30</pre>'},
{title:"رشته‌ها",desc:"کار با متن‌ها",html:'<h3>📝 رشته:</h3><pre>name = "علی"</pre><h3>🔧 عملیات:</h3><pre>text = "سلام دنیا"\nprint(len(text))\nprint(text[0])\nprint(text.upper())\nprint(text.replace("دنیا","جهان"))</pre><h3>💡 f-string:</h3><pre>name = "علی"\nprint(f"اسم من {name} است")</pre>'},
{title:"عملگرها",desc:"عملیات ریاضی و منطقی",html:'<h3>➗ ریاضی:</h3><pre>a = 10\nb = 3\nprint(a + b)   # 13\nprint(a - b)   # 7\nprint(a * b)   # 30\nprint(a / b)   # 3.33\nprint(a // b)  # 3\nprint(a % b)   # 1\nprint(a ** b)  # 1000</pre>'},
{title:"ورودی و خروجی",desc:"گرفتن ورودی از کاربر",html:'<h3>📤 print:</h3><pre>print("سلام")</pre><h3>📥 input:</h3><pre>name = input("اسمت چیه؟ ")\nprint("سلام " + name)</pre><h3>⚠️ نکته:</h3><p>input همیشه رشته برمی‌گرداند.</p><pre>age = int(input("سن: "))\nprint(age + 1)</pre>'},
{title:"شرط‌ها (if/else)",desc:"تصمیم‌گیری در برنامه",html:'<h3>🤔 شرط:</h3><pre>age = 18\nif age >= 18:\n    print("بزرگسال")\nelse:\n    print("کودک")</pre><h3>🔀 elif:</h3><pre>score = 85\nif score >= 90:\n    print("عالی")\nelif score >= 75:\n    print("خوب")\nelse:\n    print("تلاش کن")</pre>'},
{title:"حلقه‌ها",desc:"for و while",html:'<h3>🔄 for:</h3><pre>for i in range(5):\n    print(i)</pre><h3>🔄 while:</h3><pre>i = 1\nwhile i <= 5:\n    print(i)\n    i += 1</pre><h3>⏹️ break:</h3><pre>for i in range(10):\n    if i == 5:\n        break\n    print(i)</pre>'},
{title:"لیست‌ها",desc:"ذخیره چند مقدار",html:'<h3>📋 لیست:</h3><pre>numbers = [1, 2, 3, 4, 5]</pre><h3>🔧 دسترسی:</h3><pre>fruits = ["سیب", "موز"]\nprint(fruits[0])\nprint(fruits[-1])</pre><h3>➕ اضافه:</h3><pre>fruits.append("انگور")</pre><h3>➖ حذف:</h3><pre>fruits.remove("موز")</pre>'},
{title:"تاپل‌ها",desc:"لیست‌های غیرقابل تغییر",html:'<h3>📦 تاپل:</h3><pre>point = (3, 5)\ncolors = ("قرمز", "سبز")</pre><h3>🔄 تفکیک:</h3><pre>x, y = (3, 5)\nprint(x)   # 3\nprint(y)   # 5</pre>'},
{title:"دیکشنری‌ها",desc:"کلید-مقدار",html:'<h3>📖 دیکشنری:</h3><pre>person = {\n    "name": "علی",\n    "age": 25\n}</pre><h3>🔍 دسترسی:</h3><pre>print(person["name"])</pre><h3>🔁 پیمایش:</h3><pre>for key, value in person.items():\n    print(key, value)</pre>'},
{title:"مجموعه‌ها (Sets)",desc:"مجموعه بدون تکرار",html:'<h3>🎯 مجموعه:</h3><pre>numbers = {1, 2, 3, 4, 5}</pre><h3>🔧 حذف تکراری:</h3><pre>nums = {1, 2, 2, 3, 3}\nprint(nums)   # {1, 2, 3}</pre><h3>🔧 عملیات:</h3><pre>a = {1, 2, 3}\nb = {3, 4, 5}\nprint(a | b)   # اجتماع\nprint(a & b)   # اشتراک</pre>'},
{title:"توابع",desc:"ساختاردهی به کد",html:'<h3>🎯 تابع:</h3><pre>def greet():\n    print("سلام!")\n\ngreet()</pre><h3>📥 با پارامتر:</h3><pre>def greet(name):\n    print("سلام " + name)\n\ngreet("علی")</pre><h3>📤 با return:</h3><pre>def add(a, b):\n    return a + b\n\nprint(add(5, 3))</pre>'},
{title:"توابع پیشرفته",desc:"Lambda و بیشتر",html:'<h3>⚡ Lambda:</h3><pre>square = lambda x: x * x\nprint(square(5))   # 25</pre><h3>🎯 با map:</h3><pre>nums = [1, 2, 3, 4]\nsquares = list(map(lambda x: x**2, nums))\nprint(squares)</pre>'},
{title:"کلاس‌ها",desc:"برنامه‌نویسی شی‌گرا",html:'<h3>🏗️ کلاس:</h3><pre>class Person:\n    def __init__(self, name, age):\n        self.name = name\n        self.age = age\n    \n    def introduce(self):\n        return "من " + self.name + " هستم"\n\np1 = Person("علی", 25)\nprint(p1.introduce())</pre><h3>🔑 مفاهیم:</h3><ul><li>class: تعریف</li><li>__init__: سازنده</li><li>self: اشاره به شیء</li></ul>'},
{title:"ارث‌بری",desc:"توسعه کلاس‌ها",html:'<h3>🧬 ارث‌بری:</h3><pre>class Animal:\n    def sound(self):\n        return "صدا"\n\nclass Dog(Animal):\n    def sound(self):\n        return "واق واق!"\n\ndog = Dog()\nprint(dog.sound())</pre>'},
{title:"فایل‌ها",desc:"خواندن و نوشتن فایل",html:'<h3>📁 نوشتن:</h3><pre>with open("test.txt", "w") as f:\n    f.write("سلام دنیا!")</pre><h3>📖 خواندن:</h3><pre>with open("test.txt", "r") as f:\n    content = f.read()\n    print(content)</pre><h3>📝 حالت‌ها:</h3><ul><li>"r": خواندن</li><li>"w": نوشتن</li><li>"a": اضافه</li></ul>'},
{title:"مدیریت خطا",desc:"try/except",html:'<h3>⚠️ مدیریت خطا:</h3><pre>try:\n    result = 10 / 0\nexcept ZeroDivisionError:\n    print("تقسیم بر صفر!")</pre><h3>🎯 انواع خطا:</h3><ul><li>ZeroDivisionError</li><li>ValueError</li><li>TypeError</li><li>KeyError</li></ul>'},
{title:"کتابخانه‌ها",desc:"استفاده از کدهای آماده",html:'<h3>📚 ماژول:</h3><pre>import math\nprint(math.pi)\nprint(math.sqrt(16))</pre><h3>🎲 random:</h3><pre>import random\nprint(random.randint(1, 10))</pre><h3>⏰ datetime:</h3><pre>from datetime import datetime\nnow = datetime.now()\nprint(now.year)</pre>'},
{title:"پروژه‌های عملی",desc:"ساخت برنامه‌های واقعی",html:'<h3>🎯 ماشین حساب:</h3><pre>a = float(input("عدد اول: "))\nop = input("عملگر: ")\nb = float(input("عدد دوم: "))\nif op == "+":\n    print(a + b)</pre><h3>🎮 حدس عدد:</h3><pre>import random\nnumber = random.randint(1, 100)\nwhile True:\n    guess = int(input("حدس: "))\n    if guess == number:\n        print("درست!")\n        break</pre><h3>🎉 تبریک!</h3><p>حالا می‌تونید پروژه بسازید!</p>'}
];

var quizData = [
{q:"کدام تابع برای چاپ است؟",opts:["echo()","print()","log()","printf()"],correct:1},
{q:"نوع داده صحیح؟",opts:["number","int","integer","num"],correct:1},
{q:"خروجی 10 // 3؟",opts:["3.33","3","4","1"],correct:1},
{q:"کلمه کلیدی تابع؟",opts:["function","def","func","define"],correct:1},
{q:"متد اضافه به لیست؟",opts:["add()","push()","append()","insert()"],correct:2},
{q:"نوع غیرقابل تغییر؟",opts:["list","dict","tuple","set"],correct:2},
{q:"تابع ورودی؟",opts:["get()","scan()","read()","input()"],correct:3},
{q:"خروجی len([1,2,3])؟",opts:["2","3","4","6"],correct:1},
{q:"تعریف کلاس؟",opts:["def","class","object","struct"],correct:1},
{q:"حذف آخرین لیست؟",opts:["remove()","delete()","pop()","drop()"],correct:2}
];
