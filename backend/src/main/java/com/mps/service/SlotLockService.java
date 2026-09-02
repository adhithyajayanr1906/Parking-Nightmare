package com.mps.service;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;
import java.util.concurrent.TimeUnit;

/**
 * SlotLockService - Enterprise Redis Distributed Locking Service
 * Prevents race conditions and guarantees atomic 15-minute slot reservations.
 */
@Service
public class SlotLockService {
    private final RedissonClient redissonClient;

    public SlotLockService(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }

    public boolean reserveSlotWithLock(Long slotId, Runnable bookingTask) {
        String lockKey = "SLOT_LOCK_" + slotId;
        RLock lock = redissonClient.getLock(lockKey);
        try {
            if (lock.tryLock(5, 15, TimeUnit.SECONDS)) {
                try {
                    bookingTask.run();
                    return true;
                } finally {
                    lock.unlock();
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return false;
    }
}
