'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, Zap, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function RoadmapPage() {
  const features = [
    {
      title: 'Workout Generation',
      description: 'AI-powered personalized workout plans',
      status: 'completed',
      icon: Zap,
      category: 'Core Features'
    },
    {
      title: 'Profile Management',
      description: 'Complete user profile and preferences',
      status: 'completed',
      icon: Target,
      category: 'Core Features'
    },
    {
      title: 'Workout Programs',
      description: 'Structured multi-week training programs',
      status: 'planned',
      icon: TrendingUp,
      category: 'Advanced Features'
    },
    {
      title: 'Nutrition Planning',
      description: 'AI-generated meal plans and nutrition tracking',
      status: 'planned',
      icon: Target,
      category: 'Nutrition'
    },
    {
      title: 'Progress Analytics',
      description: 'Detailed progress tracking and insights',
      status: 'planned',
      icon: TrendingUp,
      category: 'Analytics'
    },
    {
      title: 'Social Features',
      description: 'Share workouts and connect with others',
      status: 'future',
      icon: Target,
      category: 'Community'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'planned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'future':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'planned':
        return <Clock className="w-4 h-4" />;
      case 'future':
        return <Target className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        
        {/* Main Content */}
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cornflower-blue to-blue-600 bg-clip-text text-transparent">
              Feature Roadmap
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See what's available now and what's coming next to your AI fitness trainer
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cornflower-blue/10 rounded-lg">
                            <Icon className="w-5 h-5 text-cornflower-blue" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{feature.title}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1">
                              {feature.category}
                            </Badge>
                          </div>
                        </div>
                        <Badge 
                          className={`${getStatusColor(feature.status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(feature.status)}
                          {feature.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="text-center space-y-4">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-8">
                <h3 className="text-xl font-semibold mb-4">Ready to Get Started?</h3>
                <p className="text-muted-foreground mb-6">
                  Try out the available features and start your fitness journey with AI-powered workouts.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/workouts">
                    <Button>
                      View Workouts
                    </Button>
                  </Link>
                  <Link href="/workouts/generate">
                    <Button variant="outline">
                      Generate New Plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
