import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LogIn, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Turntable } from '@/components/Turntable';
import headphonesImg from '@/assets/headphones-gold.png';

const features = [
  {
    title: 'Music Selection',
    description:
      'Organize tracks, playlists and library with smart filters for BPM, key, energy and compatibility.',
  },
  {
    title: 'Smart Recommendations',
    description:
      'Get suggestions for the next best track based on mix, style, energy and sound affinity.',
  },
  {
    title: 'Always Updated Library',
    description:
      'Keep control of your selections, discover useful new tracks and prepare more effective sets.',
  },
];

export default function IndexPage() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Real visit counter — throttled to 1 increment per browser per 24h
  useEffect(() => {
    const KEY = 'djsengine_visit_counted_at';
    const now = Date.now();
    const last = Number(localStorage.getItem(KEY) || 0);
    if (now - last < 24 * 60 * 60 * 1000) return;
    (supabase.rpc as any)('increment_app_visit', { p_app_key: 'djsengine' })
      .then(({ error }: { error: unknown }) => {
        if (!error) localStorage.setItem(KEY, String(now));
      });
  }, []);

  return (
    <div className="flex-1 overflow-auto bg-[#f7faf8] text-slate-900">
      <main>
        {/* HERO */}
        <section className="border-b border-slate-100 bg-[#f7faf8]">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-10 lg:py-24">
            <div>
              <div className="mb-4 inline-flex items-center rounded-full border border-[#2D6A4F]/15 bg-[#2D6A4F]/5 px-4 py-1.5 text-sm font-semibold text-[#2D6A4F]">
                DJ Selection, done right
              </div>

              <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                Organize Your
                <span className="block text-center">Music</span>
                <span className="block text-center text-[#2D6A4F]">Like a DJ Pro</span>
              </h1>

              <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-600">
                Build better playlists, choose the right tracks, find great mix combinations, and keep your library fresh and organized.
              </p>
              <p className="mt-3 max-w-2xl text-xl leading-8 text-[#2D6A4F] italic font-normal">
                Works with VirtualDJ and Traktor for easy Tracks and Playlist Import and Export.
              </p>
              <p className="mt-1 max-w-2xl text-sm italic text-slate-900">
                Special Advice From Tony Caridi Dj And Producer
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={authenticated ? '/library' : '/auth'}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2D6A4F] px-7 py-4 text-base font-semibold text-white transition hover:bg-[#24563f]"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-700 transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              </div>
            </div>

            {/* Turntable with spinning disc and fixed arm */}
            <div className="flex justify-center lg:justify-end">
              <Turntable />
            </div>
          </div>
        </section>

        {/* 3 CARD subito sotto la hero */}
        <section id="features" className="bg-[#f7faf8] pb-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {features.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
                  >
                    <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center">
                      <img src={headphonesImg} alt="DJ Headphones" className="h-28 w-28 object-contain" />
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight text-slate-900">{item.title}</h3>
                    <p className="mt-5 text-lg leading-8 text-slate-600">{item.description}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>


        {/* CTA finale */}
        <section className="bg-[#f7faf8] py-20">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-10">
            <h2 className="whitespace-nowrap text-2xl font-normal tracking-tight text-slate-950 md:text-3xl">
              Ready to Improve Your Music Selection ?
            </h2>
            <p className="mt-5 text-xl leading-8 text-slate-600">
              Access your library, organize tracks and build smarter sets.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#2D6A4F] px-7 py-4 text-base font-semibold text-white transition hover:bg-[#24563f]"
              >
                Register Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-semibold text-slate-700 transition hover:border-[#2D6A4F] hover:text-[#2D6A4F]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-slate-950 lg:px-10">
          © {new Date().getFullYear()} DJ'S Engine by AC Digital App. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
