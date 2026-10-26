Title: The Sleeping Barber Problem
Category: Concurrency
Date: 2026-10-26
Summary: One barber, a few waiting chairs, three semaphores -- step through every wait() and signal(), then break the solution on purpose and see which guarantee fails first.
Tags: concurrency, semaphores, synchronization, race-conditions, deadlock
Slug: sleeping-barber
Thumbnail: extra/sketches/sleeping-barber/thumb.svg
Script: extra/sketches/sleeping-barber/sketch.js
Layout: freeform
Runtime: vanilla

<div class="byline">
<div class="byline-who">
<span class="byline-eyebrow">Posed by</span>
<span class="byline-name">Edsger W. Dijkstra</span>
</div>
<p class="byline-meta">A 1965 classic for testing semaphore solutions. It asks
for three things at once -- mutual exclusion, signalling between threads, and
a bounded buffer (the waiting chairs) -- in about a dozen lines. This page is
a companion to CMSC 215: <code>wait()</code> and <code>signal()</code> follow
the course handout's definitions, and the simulator runs them one instruction
at a time.</p>
</div>

<div class="complexity">
<div class="cx-item"><span class="cx-label">Semaphores</span><span class="cx-value">3</span></div>
<div class="cx-item"><span class="cx-label">Shared counter</span><span class="cx-value">waiting</span></div>
<div class="cx-item"><span class="cx-label">Waiting chairs</span><span class="cx-value">N</span></div>
</div>

<div class="page-tabs" role="tablist" aria-label="Sleeping barber sections">
<button type="button" role="tab" id="tab-learn" aria-controls="panel-learn" aria-selected="true">Learn</button>
<button type="button" role="tab" id="tab-try" aria-controls="panel-try" aria-selected="false" tabindex="-1">Try it</button>
<button type="button" role="tab" id="tab-python" aria-controls="panel-python" aria-selected="false" tabindex="-1">In Python</button>
</div>

<section class="tab-panel" id="panel-learn" role="tabpanel" aria-labelledby="tab-learn">

<h2>One barber, N chairs, nobody stepping on anybody</h2>
<p>A barbershop has one barber chair and <code>N</code> waiting chairs. With no
customers, the barber sleeps. A customer who walks in wakes him if he is
asleep; if he is busy, the customer takes a waiting chair; if all <code>N</code>
chairs are taken, the customer leaves. Easy to say, easy to get wrong: the
count of waiting customers is a race, a wake-up can be lost, and a lock in the
wrong place freezes the whole shop.</p>

<h3>Three semaphores and a counter</h3>
<ul>
<li><code>customers</code> (starts at 0) counts customers who have taken a chair. The barber waits on it, so a value of 0 means he sleeps.</li>
<li><code>barber</code> (starts at 0) is the barber's &ldquo;next, please.&rdquo; A seated customer waits on it until called.</li>
<li><code>mutex</code> (starts at 1) is a lock around <code>waiting</code>.</li>
<li><code>waiting</code> is a plain integer: how many chairs are occupied. A semaphore can't be read, so the shop keeps its own count to decide whether it is full.</li>
</ul>

<p>The semaphore operations, as the handout defines them:</p>
<pre class="code-block">wait(s):    if s &gt; 0:  s = s - 1
            else:      enqueue(Q, caller) and block

signal(s):  if Q is empty:  s = s + 1
            else:           dequeue(Q, p) and make p ready   # s unchanged</pre>

<h3>The two programs</h3>
<pre class="code-block">barber():                              customer():
  while true:                            wait(mutex)
    wait(customers)   # sleep if empty   if waiting &lt; N:
    wait(mutex)                              waiting = waiting + 1
    waiting = waiting - 1                    signal(customers)  # wake the barber
    signal(barber)    # call next            signal(mutex)
    signal(mutex)                            wait(barber)       # wait my turn
    cut_hair()                               get_haircut()
                                         else:
                                             signal(mutex)      # full, leave</pre>

<p>Read it as two handshakes. The customer's <code>signal(customers)</code> says
&ldquo;someone is here&rdquo;; the barber's <code>signal(barber)</code> says
&ldquo;you're up.&rdquo; Each side sleeps on a semaphore the other one signals.</p>

<p>One detail worth a pause: the customer releases <code>mutex</code>
<em>before</em> <code>wait(barber)</code>.</p>
<details class="answer">
<summary>Why does the order matter?</summary>
<p>The barber needs <code>mutex</code> before he can <code>signal(barber)</code>. A
customer who goes to sleep on <code>barber</code> while still holding
<code>mutex</code> is waiting for a signal that only the barber can send, and
the barber is waiting for the lock that customer holds. Neither can ever move.</p>
</details>

<h3>Why the simulator splits one line in two</h3>
<p><code>waiting = waiting + 1</code> looks like one step, but a CPU does it as
load, add, store. The simulator shows it as <code>t = waiting</code> followed by
<code>waiting = t + 1</code>, so a second thread can slip in between. That gap
is the whole reason <code>mutex</code> exists, and you can open it on purpose
in the next tab.</p>

</section>

<section class="tab-panel" id="panel-try" role="tabpanel" aria-labelledby="tab-try" hidden>

<h2>Run it, then break it</h2>
<p>Press <b>Step</b> to run one instruction of one thread, or <b>Run</b> to let
the scheduler go. In the code panels, a solid badge marks where a thread is
ready to run and a dashed one marks where it is blocked. The checks under
<em>Semaphores</em> watch three invariants and report the tick where each one
first broke.</p>

<div id="sbs-host"></div>
<noscript><p>The simulator needs JavaScript.</p></noscript>

<h3>Predict, then run</h3>
<p>Each scenario has a one-click preset above the simulator. Commit to a guess
before you press Run; the answers use the default settings of that preset.</p>
<ol class="predict">
<li><b>Busy morning.</b> Two chairs, a slow barber, eight customers. How many
walk out?
<details class="answer"><summary>Answer</summary><p>Three are turned away and five are
served. The shop is full each time a customer arrives while the barber is
mid-haircut and both chairs are taken.</p></details></li>

<li><b>Quiet morning.</b> Customers arrive 30 ticks apart. How many times does
the barber fall asleep?
<details class="answer"><summary>Answer</summary><p>Six, for five customers: once before the
first customer arrives and once after every haircut. Nobody is turned away.</p></details></li>

<li><b>Race without the mutex.</b> The lock is off and the scheduler is random.
Which check fails first, and why?
<details class="answer"><summary>Answer</summary><p>At tick 23 both
<em>0 &le; waiting &le; N</em> and <em>waiting = seats taken</em> break at once. A
customer had read <code>waiting = 2</code>; before it wrote back, the barber took
a customer and stored 1; the customer then wrote 2 + 1 = 3, erasing the barber's
decrement. By closing time <code>waiting</code> reads &minus;2 in an empty shop.</p></details></li>

<li><b><code>mutex</code> starts at 0.</b> Who gets served?
<details class="answer"><summary>Answer</summary><p>Nobody. The lock starts out taken, no thread
holds it, so no thread can release it. By tick 31 all six customers are queued
on <code>mutex</code>, the barber is asleep, and the simulator reports a
deadlock. A lock nobody holds is still a lock.</p></details></li>

<li><b><code>customers</code> starts at 1.</b> The shop is empty. What does the
barber do?
<details class="answer"><summary>Answer</summary><p>He wakes, &ldquo;takes&rdquo; a customer who
doesn't exist, and drives <code>waiting</code> to &minus;1 at tick 4 before cutting
nobody's hair. The range check goes red and stays red, even after real customers
arrive.</p></details></li>

<li><b><code>barber</code> starts at 1.</b> Which check catches the problem?
<details class="answer"><summary>Answer</summary><p>None of them. The first customer walks
through <code>wait(barber)</code> without blocking and is already in
<code>get_haircut()</code> at tick 12; the barber doesn't start cutting until
tick 17. At closing, <code>barber</code> still holds a leftover 1. The
invariants all pass because nobody wrote this one down.</p></details></li>
</ol>

<p><b>Challenge.</b> Turn the mutex off, set the scheduler to <em>I pick the
thread</em>, and arrive two customers. Can you force a lost update by hand? It
takes only a handful of well-chosen steps. <b>Back</b> is there for when you
guess wrong.</p>

</section>

<section class="tab-panel" id="panel-python" role="tabpanel" aria-labelledby="tab-python" hidden>

<h2>The same algorithm with real threads</h2>
<p><code>ssp.py</code> builds <code>wait()</code> and <code>signal()</code> from
scratch: a counter, a FIFO queue of blocked threads, and one
<code>threading.Event</code> per sleeper. It then runs the shop with one thread
for the barber and one per customer. The simulator's instruction lists follow
the same <code>wait</code>/<code>signal</code> sequence (<code>ssp.py</code> adds
one extra semaphore, <code>done</code>, so the main thread can wait for the last
haircut). The difference is who picks the interleaving: here it is the operating
system, not you.</p>

<pre class="code-block">python ssp.py --chairs 2 --customers 8 --trace</pre>

<p><code>--trace</code> prints every <code>wait</code> and <code>signal</code>: how the
semaphore's value changes, or who blocks and who gets woken. The other options are
<code>--chairs</code>, <code>--customers</code>, <code>--cut-time</code> and
<code>--max-gap</code> (seconds), and <code>--seed</code> for the arrival gaps.
When the shop closes, the script asserts that
<code>customers</code> and <code>barber</code> are back at 0, <code>mutex</code>
is back at 1 and <code>waiting</code> is 0 -- the same kind of invariants the
simulator checks.</p>

<p><a href="../../extra/sketches/sleeping-barber/ssp.py" download>Download ssp.py</a></p>

<details class="answer">
<summary>Show the source</summary>
<pre class="code-block">import threading
from collections import deque
import argparse
import random
import time

# ========= SEMAPHORE ========= #
class Semaphore:

    def __init__(self, value=1, name="s", trace=None):
        if value &lt; 0:
            raise ValueError("a semaphore cannot start below 0")

        self.value = value
        self.name = name
        self._trace = trace

        self.queue = deque()
        self._atomic = threading.Lock()

    def wait(self):
        me = threading.current_thread().name
        flag = threading.Event()

        with self._atomic:
            if self.value &gt; 0: # if (s &gt; 0)
                self._say(me, f"wait({self.name}): {self.value} -&gt; {self.value - 1}")
                self.value -= 1 # s = s - 1
                return

            self.queue.append((me, flag)) # else enqueue(Q, process)
            self._say(me, f"wait({self.name}): value is 0, BLOCKED Q={self._names()}")

        flag.wait()

    def signal(self):
        me = threading.current_thread().name
        with self._atomic:
            if not self.queue: # if empty(Q)
                self._say(me, f"signal({self.name}): {self.value} -&gt; {self.value + 1}")
                self.value += 1 # s = s + 1
            else:
                who, flag = self.queue.popleft() # dequeue(Q, blocked_process)
                self._say(me, f"signal({self.name}): wakes {who} (value stays {self.value})")
                flag.set() # make_ready(blocked_process)

    def _names(self):
        return [who for who, _ in self.queue]

    def _say(self, who, text):
        if self._trace:
            self._trace(who, text)

    def __repr__(self):
        return f"Semaphore({self.name}): value={self.value}, Q={self._names()}"

# ========= MAIN ========= #
def run(chairs=3, n_customers=10, cut_time=2, max_gap=1, seed=1, trace=False):
    rng = random.Random(seed) # just some random arrival interval
    t0 =  time.monotonic()
    print_lock = threading.Lock()

    def log(who, msg):
        with print_lock:
            print(f"[{time.monotonic()  - t0:5.2f}s] {who:&gt;3}: {msg}", flush=True)

    hook = (lambda who, text: log(who, "     " + text)) if trace else None

    waiting = 0
    customers = Semaphore(0, "customers", hook)
    barber = Semaphore(0, "barber", hook)
    mutex = Semaphore(1, "mutex", hook)
    done = Semaphore(0, "done") # wait for last haircut

    results = []

    def barber_thread():
        nonlocal waiting
        while True:
            if customers.value == 0:
                log("Barber", "nobody is here, zzz")
            customers.wait()
            mutex.wait()
            waiting -= 1
            log("Barber", f"next customer please ({waiting} remaining customers waiting)")
            barber.signal()
            mutex.signal()
            log("Barber", "cutting hair")
            time.sleep(cut_time) # simulate cutting hair
            log("Barber", "phew, finished cutting")
            done.signal()

    def customer_thread(name):
        nonlocal waiting
        log(name, "i want a haircut")
        mutex.wait()
        if waiting &lt; chairs:
            waiting += 1
            log(name, f"i'm gonna wait on the waiting room ({waiting}/{chairs} chairs taken)")
            customers.signal()
            mutex.signal()
            barber.wait() # wait for barbers call before proceeding to next line
            log(name, "my turn to get my hair done")
            results.append("served")
        else:
            log(name, "i'm leaving, the shop is full")
            mutex.signal()
            results.append("left the barbershop")

    threading.Thread(target=barber_thread, name="Barber", daemon=True).start()

    customer_threads = []
    for i in range(1, n_customers + 1):
        t = threading.Thread(target=customer_thread, args=(f"Customer {i}",), name=f"Customer {i}")
        t.start()
        customer_threads.append(t)
        time.sleep(rng.uniform(0, max_gap)) # simulate next customer gap in arriving to the barbershop

    for t in customer_threads:
        t.join()

    served = results.count("served")
    for _ in range(served):
        done.wait() # block until all are done with the haircut

    left = results.count("left the barbershop")

    # Check for bugs by ensuring semaphore is back to initial state
    assert served + left == n_customers, (served, left, n_customers)
    assert customers.value == 0 and barber.value == 0 and mutex.value == 1, (customers, barber, mutex)
    assert waiting == 0, waiting

    log("--", f"closed: {served} served, {left} left, barber asleep, "
              f"customers={customers.value} barber={barber.value} mutex={mutex.value} waiting={waiting}")
    return {"served": served, "left_the_shop": left}

def main():
    p = argparse.ArgumentParser(description="Single sleeping barber")
    p.add_argument("--chairs", type=int, default=3, help="waiting chairs, N (default 3)")
    p.add_argument("--customers", type=int, default=10, help="customers in total (default 10)")
    p.add_argument("--cut-time", type=float, default=2, help="seconds per haircut (default 0.4)")
    p.add_argument("--max-gap", type=float, default=1, help="max seconds between arrivals (default 0.3)")
    p.add_argument("--seed", type=int, default=1, help="seed for arrival gaps (default 1)")
    p.add_argument("--trace", action="store_true", help="print every wait/signal with the semaphore value")

    a = p.parse_args()
    if a.chairs &lt; 1 or a.customers &lt; 1:
        p.error("--chairs and --customers must be at least 1")

    run(a.chairs, a.customers, a.cut_time, a.max_gap, a.seed, a.trace)

if __name__ == "__main__":
    main()</pre>
</details>

</section>

