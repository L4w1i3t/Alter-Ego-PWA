/**
 * Performance Metrics Utility
 * Collects and logs performance metrics for the PWA
 */

// Import OpenAI token usage stats
import { getTokenUsageStats } from './openaiApi';
import { tokenTracker } from './tokenTracker';

// Declare custom window properties for metrics sharing
declare global {
  interface Window {
    ALTER_EGO_METRICS?: {
      currentFPS: number;
    };
  }
}

interface PerformanceMetric {
  timestamp: number;
  type: string;
  value: number;
  details?: Record<string, any>;
}

interface WebVitalsData {
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift (unitless)
  ttfb?: number; // Time to First Byte (ms)
  fcp?: number; // First Contentful Paint (ms)
  inp?: number; // Interaction to Next Paint (ms)
}

interface AiPerformanceData {
  responseTime?: {
    // AI response generation times (ms)
    avg: number; // Average response time
    min: number; // Minimum response time
    max: number; // Maximum response time
    count: number; // Number of responses
  };
  tokenUsage?: {
    // Token usage statistics
    total: number; // Total tokens used
    byModel: Record<string, number>; // Tokens by model
  };
}

interface PerformanceReport {
  sessionId: string;
  startTime: number;
  userAgent: string;
  deviceInfo: {
    screenWidth: number;
    screenHeight: number;
    devicePixelRatio: number;
    platform: string;
    isMobile: boolean;
    isOnline: boolean;
  };
  metrics: PerformanceMetric[];
  navigationTiming?: Record<string, number | string>;
  resourceTiming?: Array<Record<string, any>>;
  memoryInfo?: Record<string, any>;
  webVitals?: WebVitalsData;
  aiPerformance?: AiPerformanceData;
  resourceSummary?: {
    totalResources: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
    slowestResources: Array<{ name: string; duration: number }>;
  };
  summary?: {
    overallPerformanceScore?: number;
    keyFindings: string[];
    recommendations: string[];
  };
}

// Singleton instance for the metrics collector
let currentReport: PerformanceReport | null = null;
let isDevMode = process.env.NODE_ENV === 'development';
let isMetricsEnabled = isDevMode;
// Flag to prevent multiple report generation
let isGeneratingReport = false;
// Flag to track if hotkey listener is already set up
let hotkeyListenerInitialized = false;

// Track AI response times
const aiResponseTimes: number[] = [];

// Improved FPS tracking
let rafFpsFrameCount = 0;
let rafFpsLastTime = performance.now();
let currentFPS = 0;
let fpsRafId: number | null = null; // allow cancellation on re-init

// Periodic collector interval id (browser/Node compatible)
let periodicIntervalId: ReturnType<typeof setInterval> | null = null;

// Keep a single long-lived CLS observer
let clsObserverRef: PerformanceObserver | null = null;

// Track FPS using requestAnimationFrame for more accurate measurement
const trackFPS = (): void => {
  if (!isMetricsEnabled) return;

  // Add metrics to window object for sharing across components
  if (!window.ALTER_EGO_METRICS) {
    window.ALTER_EGO_METRICS = {
      currentFPS: 0,
    };
  }

  const updateFPS = () => {
    rafFpsFrameCount++;
    const now = performance.now();

    if (now - rafFpsLastTime >= 1000) {
      currentFPS = rafFpsFrameCount;
      rafFpsFrameCount = 0;
      rafFpsLastTime = now;

      // Update the global metrics object
      if (window.ALTER_EGO_METRICS) {
        window.ALTER_EGO_METRICS.currentFPS = currentFPS;
      }

      // Capture the FPS metric immediately when calculated
      if (currentReport) {
        captureMetric('fps', currentFPS);
      }
    }

    if (isMetricsEnabled) {
      fpsRafId = requestAnimationFrame(updateFPS);
    }
  };

  // Start the FPS tracking loop
  if (fpsRafId !== null) {
    cancelAnimationFrame(fpsRafId);
    fpsRafId = null;
  }
  fpsRafId = requestAnimationFrame(updateFPS);
};

/**
 * Initialize a new performance metrics collection session
 */
export const initPerformanceMonitoring = (): void => {
  if (!isMetricsEnabled) return;

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Create device info object for better context
  const deviceInfo = {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    platform: navigator.platform,
    isMobile:
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
    isOnline: navigator.onLine,
  };

  currentReport = {
    sessionId,
    startTime: Date.now(),
    userAgent: navigator.userAgent,
    deviceInfo,
    metrics: [],
  };

  // Initialize AI performance tracking
  aiResponseTimes.length = 0;

  // Collect initial navigation timing
  if (window.performance && window.performance.timing) {
    setTimeout(() => {
      captureNavigationTiming();
    }, 0);
  }

  // Start periodic collection of metrics
  startPeriodicCollection();

  // Start accurate FPS tracking
  trackFPS();

  // Setup hotkey listener (only in dev mode and only once)
  if (isDevMode && !hotkeyListenerInitialized) {
    setupHotkeyListener();
    hotkeyListenerInitialized = true;
  }

  // Capture Web Vitals after page load
  setTimeout(() => {
    captureWebVitals();
  }, 5000); // Wait 5 seconds for metrics to be available

  console.log('Performance monitoring initialized', sessionId);
};

/**
 * Set up hotkey listener for manual performance report generation
 * Ctrl+Alt+P triggers a report generation
 */
const setupHotkeyListener = (): void => {
  window.addEventListener('keydown', event => {
    // Check for Ctrl+Alt+P (Cmd+Option+P on Mac)
    if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 'p') {
      console.log('Performance metrics hotkey detected, generating report...');
      event.preventDefault(); // Prevent any default browser action

      // Generate a report now
      generateReport().then(() => {
        // Start a fresh session after the report is generated
        initPerformanceMonitoring();

      // Show user feedback
      showHotkeyFeedback();
    });
    }

    // Ctrl+Alt+M: Clear metrics + token logs and restart session
    if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === 'm') {
      console.log('Clearing performance metrics and token usage logs...');
      event.preventDefault();
      clearPerformanceData();
    }
  });

  console.log(
    'Performance metrics hotkeys: Ctrl+Alt+P = report, Ctrl+Alt+M = clear'
  );
};

/**
 * Show visual feedback when the hotkey is pressed
 */
const showHotkeyFeedback = (): void => {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #4caf50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    z-index: 10000;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    transition: opacity 0.3s;
  `;
  feedback.textContent = 'Performance report generated!';

  document.body.appendChild(feedback);

  // Remove after 3 seconds
  setTimeout(() => {
    feedback.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 300);
  }, 3000);
};

/**
 * Capture a performance metric with the given name and value
 */
export const captureMetric = (
  type: string,
  value: number,
  details?: Record<string, any>
): void => {
  if (!isMetricsEnabled || !currentReport) return;

  currentReport.metrics.push({
    timestamp: Date.now(),
    type,
    value,
    details,
  });
  // Cap metrics array to avoid unbounded growth in long sessions
  if (currentReport.metrics.length > 5000) {
    currentReport.metrics.splice(0, currentReport.metrics.length - 5000);
  }
};

/**
 * Capture Web Vitals metrics using the PerformanceObserver API
 * These are critical user-centric metrics that measure real-world user experience
 */
const captureWebVitals = (): void => {
  if (!isMetricsEnabled || !currentReport) return;

  // Initialize web vitals object
  currentReport.webVitals = {};

  // Use newer API to get navigation timing for TTFB
  const navEntries = performance.getEntriesByType('navigation');
  if (navEntries.length > 0) {
    const navEntry = navEntries[0] as PerformanceNavigationTiming;
    if (!currentReport.webVitals) currentReport.webVitals = {};
    currentReport.webVitals.ttfb = navEntry.responseStart - navEntry.requestStart;
  }

  // For FCP, we get the entry from the paint observer (already captured)
  let fcpObserved = false;
  const paintObserver = new PerformanceObserver(entries => {
    const fcpEntries = entries
      .getEntries()
      .filter(entry => entry.name === 'first-contentful-paint');
    if (fcpEntries.length > 0 && currentReport) {
      if (!currentReport.webVitals) currentReport.webVitals = {};
      currentReport.webVitals.fcp = fcpEntries[0].startTime;
      fcpObserved = true;
    }
  });

  try {
    // Observe paint timing events (FCP)
    paintObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    console.warn('Paint timing observation not supported', e);
  }

  // For LCP, we use dedicated observer
  let lcpObserved = false;
  const lcpObserver = new PerformanceObserver(entries => {
    // We only want the latest LCP entry
    const lcpEntry = entries.getEntries().pop();
    if (lcpEntry && currentReport) {
      if (!currentReport.webVitals) currentReport.webVitals = {};
      currentReport.webVitals.lcp = lcpEntry.startTime;
      lcpObserved = true;
    }
  });

  try {
    // Observe LCP events
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    console.warn('LCP observation not supported', e);
  }

  // For CLS, we use a single long-lived layout-shift observer to avoid duplicates
  let cumulativeLayoutShift = 0;
  if (!clsObserverRef) {
    const clsObserver = new PerformanceObserver(entries => {
      for (const entry of entries.getEntries()) {
        // Skip entries with 0 value (not relevant)
        if (!(entry as any).value) continue;

        // Add up the layout shift values
        cumulativeLayoutShift += (entry as any).value;
      }

      if (currentReport) {
        if (!currentReport.webVitals) currentReport.webVitals = {};
        currentReport.webVitals.cls = cumulativeLayoutShift;
      }
    });

    try {
      // Observe layout shift events
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      clsObserverRef = clsObserver;
    } catch (e) {
      console.warn('Layout shift observation not supported', e);
    }
  }

  // Clean up observers after 5 seconds (enough time to collect initial metrics)
  setTimeout(() => {
    try {
      paintObserver.disconnect();
      lcpObserver.disconnect();
      // Don't disconnect CLS observer as we want to track shifts over time
    } catch (e) {
      console.warn('Error disconnecting observers', e);
    }

    // Final fallback for FCP/LCP
    if (
      !fcpObserved &&
      window.performance &&
      window.performance.getEntriesByType
    ) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntries = paintEntries.filter(
        entry => entry.name === 'first-contentful-paint'
      );
      if (fcpEntries.length > 0 && currentReport) {
        if (!currentReport.webVitals) currentReport.webVitals = {};
        currentReport.webVitals.fcp = fcpEntries[0].startTime;
      }
    }
  }, 5000);
};

/**
 * Track AI model response time
 * Call this when an AI response is received to track performance
 */
export const trackAiResponseTime = (responseTimeMs: number): void => {
  if (!isMetricsEnabled || !currentReport) return;

  aiResponseTimes.push(responseTimeMs);

  // Update the AI performance metrics immediately
  updateAiPerformanceMetrics();
};

/**
 * Update AI Performance metrics based on collected data
 */
const updateAiPerformanceMetrics = (): void => {
  if (!isMetricsEnabled || !currentReport || aiResponseTimes.length === 0)
    return;

  if (!currentReport.aiPerformance) {
    currentReport.aiPerformance = {
      responseTime: {
        avg: 0,
        min: 0,
        max: 0,
        count: 0,
      },
    };
  }

  // Calculate response time statistics
  const sum = aiResponseTimes.reduce((sum, time) => sum + time, 0);
  const avg = sum / aiResponseTimes.length;
  const min = Math.min(...aiResponseTimes);
  const max = Math.max(...aiResponseTimes);

  currentReport.aiPerformance.responseTime = {
    avg,
    min,
    max,
    count: aiResponseTimes.length,
  };

  // Get token usage statistics
  try {
    currentReport.aiPerformance.tokenUsage = getTokenUsageStats();
  } catch (error) {
    console.error('Error getting token usage stats:', error);
  }
};

/**
 * Capture navigation timing information using Performance Timeline API (Level 2)
 */
const captureNavigationTiming = (): void => {
  if (
    !isMetricsEnabled ||
    !currentReport ||
    !window.performance ||
    !window.performance.getEntriesByType
  )
    return;

  // Get the navigation timing entries using the newer API
  const navEntries = window.performance.getEntriesByType('navigation');
  if (navEntries.length === 0) return;

  // Cast to PerformanceNavigationTiming which has the timing metrics
  const navTiming = navEntries[0] as PerformanceNavigationTiming;

  // Calculate key metrics using the modern API properties
  currentReport.navigationTiming = {
    startTime: navTiming.startTime,
    redirectTime: navTiming.redirectEnd - navTiming.redirectStart,
    dnsTime: navTiming.domainLookupEnd - navTiming.domainLookupStart,
    connectTime: navTiming.connectEnd - navTiming.connectStart,
    tlsTime:
      navTiming.secureConnectionStart > 0
        ? navTiming.connectEnd - navTiming.secureConnectionStart
        : 0,
    requestTime: navTiming.responseStart - navTiming.requestStart,
    responseTime: navTiming.responseEnd - navTiming.responseStart,
    domProcessingTime:
      navTiming.domComplete - navTiming.domContentLoadedEventStart,
    domInteractiveTime:
      navTiming.domInteractive - navTiming.domContentLoadedEventStart,
    loadEventTime: navTiming.loadEventEnd - navTiming.loadEventStart,
    fetchTime: navTiming.responseEnd - navTiming.fetchStart,
    totalPageLoadTime: navTiming.loadEventEnd - navTiming.startTime,
    navigationTypeCode:
      navTiming.type === 'navigate'
        ? 0
        : navTiming.type === 'reload'
          ? 1
          : navTiming.type === 'back_forward'
            ? 2
            : navTiming.type === 'prerender'
              ? 3
              : 4,
    navigationTypeName: navTiming.type,
    redirectCount: navTiming.redirectCount,
  };
};

/**
 * Capture resource timing information for key resources
 */
const captureResourceTiming = (): void => {
  if (
    !isMetricsEnabled ||
    !currentReport ||
    !window.performance ||
    !window.performance.getEntriesByType
  )
    return;

  const resources = window.performance.getEntriesByType('resource');
  const filteredResources = resources.map(resource => {
    const entry = resource as PerformanceResourceTiming;
    return {
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      transferSize: entry.transferSize,
      decodedBodySize: entry.decodedBodySize,
      initiatorType: entry.initiatorType,
    };
  });

  currentReport.resourceTiming = filteredResources;

  // Generate resource summary
  generateResourceSummary(filteredResources);
};

/**
 * Generate summary information about loaded resources
 */
const generateResourceSummary = (
  resources: Array<Record<string, any>>
): void => {
  if (!currentReport) return;

  // Initialize resource summary
  const summary = {
    totalResources: resources.length,
    totalSize: 0,
    byType: {} as Record<string, { count: number; size: number }>,
    slowestResources: [] as Array<{ name: string; duration: number }>,
  };

  // Process each resource
  resources.forEach(resource => {
    // Add to total size
    const size = resource.decodedBodySize || resource.transferSize || 0;
    summary.totalSize += size;

    // Group by type
    const type = resource.initiatorType || 'other';
    if (!summary.byType[type]) {
      summary.byType[type] = { count: 0, size: 0 };
    }
    summary.byType[type].count++;
    summary.byType[type].size += size;

    // Track slowest resources
    summary.slowestResources.push({
      name: resource.name,
      duration: resource.duration,
    });
  });

  // Sort and limit slowest resources
  summary.slowestResources.sort((a, b) => b.duration - a.duration);
  summary.slowestResources = summary.slowestResources.slice(0, 5); // Keep only top 5

  currentReport.resourceSummary = summary;
};

/**
 * Capture memory information if available
 */
const captureMemoryInfo = (): void => {
  if (!isMetricsEnabled || !currentReport) return;

  const memory = (performance as any).memory;

  if (memory) {
    currentReport.memoryInfo = {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
    };
  }
};

/**
 * Start periodic collection of metrics
 */
const startPeriodicCollection = (): void => {
  if (!isMetricsEnabled) return;

  // Collect metrics every 10 seconds
  if (periodicIntervalId !== null) {
    clearInterval(periodicIntervalId);
    periodicIntervalId = null;
  }
  periodicIntervalId = setInterval(() => {
    try {
      captureMemoryInfo();
      // FPS is now captured through requestAnimationFrame

      // Update web vitals periodically
      captureWebVitals();
    } catch (error) {
      console.error('Error collecting periodic metrics:', error);
    }
  }, 10000);

  // Add window unload listener to ensure we clean up the interval
  window.addEventListener('beforeunload', () => {
    if (periodicIntervalId !== null) {
      clearInterval(periodicIntervalId);
      periodicIntervalId = null;
    }
  });
};

/**
 * Mark a user interaction or event
 */
export const markEvent = (
  name: string,
  details?: Record<string, any>
): void => {
  if (!isMetricsEnabled || !currentReport) return;

  const now = performance.now();
  captureMetric('event', now, { name, ...details });
};

/**
 * Measure time between two points in code
 */
const timers: Record<string, number> = {};

export const startTimer = (name: string): void => {
  if (!isMetricsEnabled) return;
  timers[name] = performance.now();
};

export const endTimer = (name: string): number | null => {
  if (!isMetricsEnabled || !timers[name]) return null;

  const duration = performance.now() - timers[name];
  delete timers[name];

  captureMetric('timer', duration, { name });
  return duration;
};

/**
 * Generate a human-readable summary of the performance report
 */
const generatePerformanceSummary = (): void => {
  if (!currentReport) return;

  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  let overallScore = 0;
  let scoreFactors = 0;

  // Check memory usage
  if (currentReport.memoryInfo) {
    const memoryUsage =
      currentReport.memoryInfo.usedJSHeapSize /
      currentReport.memoryInfo.jsHeapSizeLimit;
    if (memoryUsage > 0.7) {
      keyFindings.push(
        'High memory usage detected: ' +
          (memoryUsage * 100).toFixed(1) +
          '% of available heap'
      );
      recommendations.push(
        'Consider optimizing memory usage and implementing cleanup routines'
      );
      overallScore += 30; // Poor score for high memory usage
    } else if (memoryUsage > 0.5) {
      keyFindings.push(
        'Moderate memory usage: ' +
          (memoryUsage * 100).toFixed(1) +
          '% of available heap'
      );
      overallScore += 70; // Average score for moderate memory usage
    } else {
      keyFindings.push(
        'Good memory usage: ' +
          (memoryUsage * 100).toFixed(1) +
          '% of available heap'
      );
      overallScore += 100; // Good score for low memory usage
    }
    scoreFactors++;
  }

  // Check FPS
  const fpsValues = currentReport.metrics
    .filter(m => m.type === 'fps')
    .map(m => m.value);
  if (fpsValues.length > 0) {
    const avgFps =
      fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
    if (avgFps < 30) {
      keyFindings.push(
        'Low frame rate detected: ' + avgFps.toFixed(1) + ' FPS'
      );
      recommendations.push(
        'Optimize rendering performance or reduce animation complexity'
      );
      overallScore += 30; // Poor score for low FPS
    } else if (avgFps < 55) {
      keyFindings.push('Average frame rate: ' + avgFps.toFixed(1) + ' FPS');
      overallScore += 70; // Average score
    } else {
      keyFindings.push('Good frame rate: ' + avgFps.toFixed(1) + ' FPS');
      overallScore += 100; // Good score for high FPS
    }
    scoreFactors++;
  }

  // Check web vitals
  if (currentReport.webVitals) {
    if (currentReport.webVitals.lcp) {
      const lcp = currentReport.webVitals.lcp;
      if (lcp > 2500) {
        keyFindings.push(
          'Slow Largest Contentful Paint: ' +
            lcp.toFixed(0) +
            'ms (goal is <2500ms)'
        );
        recommendations.push(
          'Optimize critical rendering path and image loading'
        );
        overallScore += 30; // Poor score
      } else {
        keyFindings.push(
          'Good Largest Contentful Paint: ' + lcp.toFixed(0) + 'ms'
        );
        overallScore += 100; // Good score
      }
      scoreFactors++;
    }

    if (currentReport.webVitals.cls !== undefined) {
      const cls = currentReport.webVitals.cls;
      if (cls > 0.1) {
        keyFindings.push('High Cumulative Layout Shift: ' + cls.toFixed(3));
        recommendations.push(
          'Fix layout instability issues by setting explicit sizes for media elements'
        );
        overallScore += 30; // Poor score
      } else {
        keyFindings.push('Good Cumulative Layout Shift: ' + cls.toFixed(3));
        overallScore += 100; // Good score
      }
      scoreFactors++;
    }
  }

  // Check AI performance
  if (currentReport.aiPerformance && currentReport.aiPerformance.responseTime) {
    const avgResponseTime = currentReport.aiPerformance.responseTime.avg;
    if (avgResponseTime > 3000) {
      keyFindings.push(
        'Slow AI response time: ' + avgResponseTime.toFixed(0) + 'ms'
      );
      recommendations.push(
        'Consider optimizing AI requests or using a faster model'
      );
      overallScore += 30; // Poor score
    } else if (avgResponseTime > 1000) {
      keyFindings.push(
        'Average AI response time: ' + avgResponseTime.toFixed(0) + 'ms'
      );
      overallScore += 70; // Average score
    } else {
      keyFindings.push(
        'Fast AI response time: ' + avgResponseTime.toFixed(0) + 'ms'
      );
      overallScore += 100; // Good score
    }
    scoreFactors++;
  }

  // Check resource loading
  if (currentReport.resourceSummary) {
    const totalSize = currentReport.resourceSummary.totalSize;
    const sizeMB = totalSize / (1024 * 1024);

    if (sizeMB > 5) {
      keyFindings.push('Large resource footprint: ' + sizeMB.toFixed(2) + 'MB');
      recommendations.push(
        'Optimize asset sizes, implement lazy loading and consider code splitting'
      );
      overallScore += 30; // Poor score
    } else {
      keyFindings.push('Good resource size: ' + sizeMB.toFixed(2) + 'MB');
      overallScore += 100; // Good score
    }
    scoreFactors++;

    // Add information about slowest resources
    if (currentReport.resourceSummary.slowestResources.length > 0) {
      const slowest = currentReport.resourceSummary.slowestResources[0];
      const slowestName = slowest.name.split('/').pop() || slowest.name;
      const slowestTime = slowest.duration;

      if (slowestTime > 500) {
        keyFindings.push(
          'Slow resource loading: ' +
            slowestName +
            ' (' +
            slowestTime.toFixed(0) +
            'ms)'
        );
        recommendations.push(
          'Optimize loading of slow resources, especially ' + slowestName
        );
      }
    }
  }

  // Calculate overall score
  const finalScore =
    scoreFactors > 0 ? Math.round(overallScore / scoreFactors) : 0;

  // Add default recommendations if none were added
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring performance metrics regularly');
  }

  // Set the summary
  currentReport.summary = {
    overallPerformanceScore: finalScore,
    keyFindings,
    recommendations,
  };
};

/**
 * Generate a performance report and submit it
 */
export const generateReport = async (): Promise<void> => {
  if (!isMetricsEnabled || !currentReport || isGeneratingReport) return;

  isGeneratingReport = true;

  try {
    // Capture final metrics
    captureResourceTiming();
    captureMemoryInfo();
    captureWebVitals();
    updateAiPerformanceMetrics();

    // Add session duration
    captureMetric('sessionDuration', Date.now() - currentReport.startTime);

    // Generate human-readable summary
    generatePerformanceSummary();

    // Format the report as a string
    const reportString = JSON.stringify(currentReport, null, 2);

    // In development mode, send to server and save locally
    if (isDevMode) {
      // First try to send to our dev server endpoint
      try {
        const response = await fetch('/save-performance-metrics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: reportString,
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Performance report saved to file:', result.filename);
        } else {
          throw new Error('Failed to save metrics to server');
        }
      } catch (serverError) {
        console.warn(
          'Failed to save metrics to server, falling back to local download:',
          serverError
        );

        // Fall back to browser download if server endpoint fails
        const blob = new Blob([reportString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create a link to download the file
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${currentReport.sessionId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clean up the URL
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }

      console.log('Performance report generated:', currentReport.sessionId);
    }

    // Reset the current report
    currentReport = null;
  } catch (error) {
    console.error('Failed to generate performance report:', error);
  } finally {
    isGeneratingReport = false;
  }
};

/**
 * Enable or disable metrics collection
 */
export const setMetricsEnabled = (enabled: boolean): void => {
  isMetricsEnabled = enabled && isDevMode; // Only allow in dev mode

  if (isMetricsEnabled && !currentReport) {
    initPerformanceMonitoring();
  }
};

/**
 * Manually trigger a performance report
 * This can be called from other parts of the application
 * Returns true if a report was generated
 */
export const triggerPerformanceReport = async (): Promise<boolean> => {
  if (!isMetricsEnabled || !currentReport) {
    return false;
  }

  await generateReport();
  // Start a new monitoring session
  initPerformanceMonitoring();
  return true;
};

/**
 * Get metrics collection state
 */
export const isPerformanceMonitoringEnabled = (): boolean => {
  return isMetricsEnabled;
};

/**
 * Clear performance monitoring data and token usage logs.
 * Useful in development to "bust" metrics without a full reload.
 */
export const clearPerformanceData = (): void => {
  try {
    // Clear Web Performance buffers
    if ('clearMarks' in performance) performance.clearMarks();
    if ('clearMeasures' in performance) performance.clearMeasures();
    if ('clearResourceTimings' in performance)
      performance.clearResourceTimings();
  } catch (e) {
    console.warn('Failed to clear performance buffers:', e);
  }

  // Reset in-memory trackers
  aiResponseTimes.length = 0;
  rafFpsFrameCount = 0;
  currentFPS = 0;
  if (window.ALTER_EGO_METRICS) {
    window.ALTER_EGO_METRICS.currentFPS = 0;
  }
  // Stop FPS loop
  if (fpsRafId !== null) {
    cancelAnimationFrame(fpsRafId);
    fpsRafId = null;
  }
  // Stop periodic collector
  if (periodicIntervalId !== null) {
    clearInterval(periodicIntervalId);
    periodicIntervalId = null;
  }
  // Disconnect CLS observer
  if (clsObserverRef) {
    try { clsObserverRef.disconnect(); } catch {}
    clsObserverRef = null;
  }
  if (currentReport) {
    currentReport.metrics = [];
    currentReport.aiPerformance = undefined;
    currentReport.memoryInfo = undefined;
    currentReport.navigationTiming = undefined;
    currentReport.resourceSummary = undefined;
    currentReport.resourceTiming = undefined;
    currentReport.webVitals = undefined;
  }

  // Clear token logs persisted in localStorage
  try {
    localStorage.removeItem('alterEgo_tokenUsage');
    localStorage.removeItem('alterEgo_tokenSummaries');
  } catch (e) {
    console.warn('Failed to clear token usage logs:', e);
  }

  // Reset live token tracker map
  try {
    tokenTracker.reset();
  } catch {}

  // Restart a clean monitoring session if enabled
  if (isMetricsEnabled) {
    initPerformanceMonitoring();
  }

  // Visual feedback
  try {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      background: #222; color: #0f0; border: 1px solid #0f0;
      padding: 10px 14px; border-radius: 4px; font-family: monospace;
    `;
    toast.textContent = 'Performance metrics cleared';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  } catch {}
};
