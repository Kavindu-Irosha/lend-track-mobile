import React, { Component, ErrorInfo, ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { router } from 'expo-router'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL UNCAUGHT ERROR:', error, errorInfo)
  }

  private handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    this.setState({ hasError: false, error: null })
  }

  private handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    this.setState({ hasError: false, error: null })
    router.replace('/(tabs)/dashboard')
  }

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconCircle}>
              <AlertTriangle size={50} color="#ef4444" />
            </View>
            
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              LendTrack encountered a critical error. We've logged the incident and you can try to restart the current view.
            </Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error?.name}: {this.state.error?.message}
              </Text>
            </View>

            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={this.handleReset}
                activeOpacity={0.8}
              >
                <RefreshCw size={20} color="#fff" />
                <Text style={styles.buttonText}>Reload App State</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={this.handleGoHome}
                activeOpacity={0.8}
              >
                <Home size={20} color="#6366f1" />
                <Text style={[styles.buttonText, { color: '#6366f1' }]}>Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Error ID: {Math.random().toString(36).substring(7).toUpperCase()}</Text>
          </View>
        </SafeAreaView>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  content: {
    flexGrow: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  errorBox: {
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginBottom: 40,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonGroup: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  secondaryButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#52525b',
    fontWeight: '600',
    letterSpacing: 1,
  },
})
