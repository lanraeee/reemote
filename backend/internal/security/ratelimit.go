package security

import (
	"fmt"
	"sync"
	"time"
)

type RateLimitBucket struct {
	tokens    float64
	lastRefill time.Time
	maxTokens float64
	refillRate float64
}

type TokenBucket struct {
	buckets map[string]*RateLimitBucket
	mu      sync.RWMutex
}

func NewTokenBucket() *TokenBucket {
	return &TokenBucket{
		buckets: make(map[string]*RateLimitBucket),
	}
}

func (tb *TokenBucket) AllowRequest(identifier string, maxRequests int, window time.Duration) bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	bucket, exists := tb.buckets[identifier]
	if !exists {
		refillRate := float64(maxRequests) / window.Seconds()
		bucket = &RateLimitBucket{
			tokens:     float64(maxRequests),
			lastRefill: time.Now(),
			maxTokens:  float64(maxRequests),
			refillRate: refillRate,
		}
		tb.buckets[identifier] = bucket
	}

	now := time.Now()
	elapsed := now.Sub(bucket.lastRefill).Seconds()
	tokensToAdd := elapsed * bucket.refillRate

	if tokensToAdd > 0 {
		bucket.tokens = min(bucket.tokens+tokensToAdd, bucket.maxTokens)
		bucket.lastRefill = now
	}

	if bucket.tokens >= 1 {
		bucket.tokens--
		return true
	}

	return false
}

func (tb *TokenBucket) Cleanup(maxAge time.Duration) {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	now := time.Now()
	for id, bucket := range tb.buckets {
		if now.Sub(bucket.lastRefill) > maxAge {
			delete(tb.buckets, id)
		}
	}
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

type RateLimiter struct {
	perUser  *TokenBucket
	perIP    *TokenBucket
	userMax  int
	ipMax    int
	window   time.Duration
}

func NewRateLimiter(userMax, ipMax int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		perUser: NewTokenBucket(),
		perIP:   NewTokenBucket(),
		userMax: userMax,
		ipMax:   ipMax,
		window:  window,
	}

	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			rl.perUser.Cleanup(time.Hour)
			rl.perIP.Cleanup(time.Hour)
		}
	}()

	return rl
}

func (rl *RateLimiter) AllowUser(userID string) bool {
	return rl.perUser.AllowRequest(userID, rl.userMax, rl.window)
}

func (rl *RateLimiter) AllowIP(ipAddress string) bool {
	return rl.perIP.AllowRequest(ipAddress, rl.ipMax, rl.window)
}

func (rl *RateLimiter) Allow(userID, ipAddress string) (bool, string) {
	if !rl.AllowUser(userID) {
		return false, fmt.Sprintf("rate limit exceeded for user")
	}

	if !rl.AllowIP(ipAddress) {
		return false, fmt.Sprintf("rate limit exceeded for IP")
	}

	return true, ""
}
