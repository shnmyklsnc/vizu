import threading
from collections import deque
import argparse
import random
import time

# ========= SEMAPHORE ========= #
class Semaphore:

    def __init__(self, value=1, name="s", trace=None):
        if value < 0:
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
            if self.value > 0: # if (s > 0)
                self._say(me, f"wait({self.name}): {self.value} -> {self.value - 1}")
                self.value -= 1 # s = s - 1
                return

            self.queue.append((me, flag)) # else enqueue(Q, process)
            self._say(me, f"wait({self.name}): value is 0, BLOCKED Q={self._names()}")

        flag.wait()

    def signal(self):
        me = threading.current_thread().name
        with self._atomic:
            if not self.queue: # if empty(Q)
                self._say(me, f"signal({self.name}): {self.value} -> {self.value + 1}")
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
            print(f"[{time.monotonic()  - t0:5.2f}s] {who:>3}: {msg}", flush=True)

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
        if waiting < chairs:
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
    if a.chairs < 1 or a.customers < 1:
        p.error("--chairs and --customers must be at least 1")

    run(a.chairs, a.customers, a.cut_time, a.max_gap, a.seed, a.trace)

if __name__ == "__main__":
    main()

