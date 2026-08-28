"""
test_generation.py - Fixed Transformer Test Script
"""

import json
from pathlib import Path
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from manim_generator import generate_video_from_llm

def test_custom_google_tts():
    creds_file = Path("manim-video-gen-480123-06fea24b1b85.json")
    if not creds_file.exists():
        raise FileNotFoundError(f"Missing credentials file: {creds_file}")
    
    with open(creds_file, 'r', encoding='utf-8') as f:
        credentials_dict = json.load(f)
    
    # FIXED CODE - All LaTeX uses double backslashes
    code = '''
from manim import *
from manim_voiceover import VoiceoverScene
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from custom_google_tts import CustomGoogleService

class AutomataTheoryDeepDive(VoiceoverScene, MovingCameraScene):
    def construct(self):
        MovingCameraScene.setup(self)
        
        self.set_speech_service(
            CustomGoogleService(
                voice='en-US-Standard-I',
                language_code='en-US',
                speaking_rate=0.90
            )
        )

        # ==========================================
        # SCENE 1: INTRODUCTORY HOOK
        # ==========================================
        with self.voiceover(text="""Welcome back. Today, we are going to visualize the abstract machines that power computer science. We will break down Automata Theory, specifically focusing on Language Operations, Finite State Machines, and the Chomsky Hierarchy. Let us make these invisible concepts visible.""") as tracker:
            title = Text("Automata Theory", font_size=60, weight=BOLD).set_color_by_gradient(BLUE, PURPLE)
            subtitle = Text("Visualizing Computation", font_size=32, color=GRAY).next_to(title, DOWN)
            
            self.play(Write(title), run_time=1.5)
            self.play(FadeIn(subtitle, shift=UP), run_time=1)
            self.wait(1)
            
            self.play(
                title.animate.scale(0.5).to_corner(UL),
                FadeOut(subtitle)
            )

        # ==========================================
        # SCENE 2: LANGUAGE OPERATIONS (CONCATENATION)
        # ==========================================
        with self.voiceover(text="""First, let us look at Language Operations. Imagine languages as bags of strings. We have Language L, containing 001, 10, and 111. And Language M, containing epsilon (the empty string) and 001.""") as tracker:
            
            set_box_l = Rectangle(height=3, width=4, color=BLUE, fill_opacity=0.1).shift(LEFT*3)
            label_l = MathTex("L").next_to(set_box_l, UP)
            strings_l = VGroup(
                MathTex("001"), MathTex("10"), MathTex("111")
            ).arrange(DOWN, buff=0.5).move_to(set_box_l)
            
            set_box_m = Rectangle(height=3, width=4, color=GREEN, fill_opacity=0.1).shift(RIGHT*3)
            label_m = MathTex("M").next_to(set_box_m, UP)
            strings_m = VGroup(
                MathTex("\\\\epsilon"), MathTex("001")
            ).arrange(DOWN, buff=0.5).move_to(set_box_m)
            
            self.play(
                Create(set_box_l), Write(label_l), Write(strings_l),
                Create(set_box_m), Write(label_m), Write(strings_m)
            )

        with self.voiceover(text="""Concatenation is like multiplication for strings. When we calculate L dot M, we take every string from L, and attach every string from M to the end of it.""") as tracker:
            
            self.play(
                strings_l.animate.arrange(DOWN, buff=1.0).shift(LEFT*1),
                FadeOut(set_box_l), FadeOut(set_box_m),
                strings_m.animate.scale(0.8).to_edge(RIGHT)
            )
            
            lines = VGroup()
            results = VGroup()
            
            for i, item_l in enumerate(strings_l):
                arrow1 = Arrow(item_l.get_right(), item_l.get_right() + RIGHT*2, buff=0.1, color=YELLOW)
                res1 = item_l.copy().next_to(arrow1, RIGHT)
                
                arrow2 = Arrow(item_l.get_right(), item_l.get_right() + RIGHT*2 + DOWN*0.5, buff=0.1, color=YELLOW)
                res2 = VGroup(item_l.copy(), MathTex("001", color=GREEN).scale(0.8)).arrange(RIGHT, buff=0.1).next_to(arrow2, RIGHT)
                
                group = VGroup(arrow1, res1, arrow2, res2).arrange(RIGHT)
                lines.add(group)

            # FIXED: Double backslashes for LaTeX
            calc_text = MathTex("L \\\\cdot M = \\\\{ uv \\\\mid u \\\\in L, v \\\\in M \\\\}").to_edge(UP)
            self.play(Write(calc_text))
            
        with self.voiceover(text="""Notice that since M contains epsilon, the original strings from L are preserved in the output. But we also get new combined strings, like 001 combined with 001.""") as tracker:
            final_set = MathTex(
                "L \\\\cdot M = \\\\{", 
                "001, 10, 111,",
                "001001, 10001, 111001",
                "\\\\}"
            ).scale(0.9).move_to(DOWN*2)
            
            self.play(Write(final_set))
            self.wait(2)
            
            self.play(
                FadeOut(strings_l), FadeOut(strings_m), FadeOut(label_l), FadeOut(label_m),
                FadeOut(lines), FadeOut(final_set), FadeOut(calc_text)
            )

        # ==========================================
        # SCENE 3: FINITE STATE MACHINES
        # ==========================================
        with self.voiceover(text="""Now, let us talk about the engines that process these languages: Finite State Machines. A Finite State Machine is formally defined as a 5-tuple.""") as tracker:
            # FIXED: Double backslashes
            tuple_tex = MathTex("M = (Q, \\\\Sigma, q_0, \\\\delta, F)").scale(1.5)
            self.play(Write(tuple_tex))
            self.wait(1)
            self.play(tuple_tex.animate.to_edge(UP).scale(0.7))

        components = [
            ("Q", "A finite set of STATES"),
            ("\\\\Sigma", "The Input Alphabet (symbols)"),
            ("q_0", "The Start State"),
            ("\\\\delta", "The Transition Function (The logic)"),
            ("F", "The set of Accept States")
        ]

        def_group = VGroup()
        for i, (sym, desc) in enumerate(components):
            row = VGroup(MathTex(sym, color=YELLOW), Text(desc, font_size=24)).arrange(RIGHT, buff=0.5)
            def_group.add(row)
        
        def_group.arrange(DOWN, buff=0.5, aligned_edge=LEFT).move_to(ORIGIN)

        with self.voiceover(text="""Q is your set of states. Sigma is your alphabet. q-not is where you start. Delta is the transition rule that tells you where to go next. And F is where you hope to end up.""") as tracker:
            self.play(LaggedStart(*[Write(row) for row in def_group], lag_ratio=1))
        
        self.wait(1)
        self.play(FadeOut(def_group), FadeOut(tuple_tex))

        # ==========================================
        # SCENE 4: DFA vs NFA VISUALIZATION
        # ==========================================
        with self.voiceover(text="""The most common question is: What is the difference between a Deterministic and a Non-Deterministic machine? Let us visualize it.""") as tracker:
            pass

        line = Line(UP*3, DOWN*3)
        left_title = Text("DFA", color=BLUE).move_to(UP*3 + LEFT*3.5)
        right_title = Text("NFA", color=RED).move_to(UP*3 + RIGHT*3.5)
        
        self.play(Create(line), Write(left_title), Write(right_title))

        d_q0 = Circle(radius=0.4, color=BLUE).move_to(LEFT*5)
        d_q1 = Circle(radius=0.4, color=BLUE).move_to(LEFT*2)
        d_arrow = Arrow(d_q0.get_right(), d_q1.get_left(), buff=0.1)
        d_label = MathTex("a").next_to(d_arrow, UP, buff=0.1)
        dfa_group = VGroup(d_q0, d_q1, d_arrow, d_label)

        n_q0 = Circle(radius=0.4, color=RED).move_to(RIGHT*2)
        n_q1 = Circle(radius=0.4, color=RED).move_to(RIGHT*5)
        n_q2 = Circle(radius=0.4, color=RED).move_to(RIGHT*5 + DOWN*1.5)
        
        n_arrow1 = Arrow(n_q0.get_right(), n_q1.get_left(), buff=0.1)
        n_label1 = MathTex("a").next_to(n_arrow1, UP, buff=0.1)
        
        n_arrow2 = Arrow(n_q0.get_center(), n_q2.get_center(), buff=0.5, path_arc=-0.5)
        n_label2 = MathTex("a").next_to(n_arrow2, DOWN, buff=0.1)
        
        nfa_group = VGroup(n_q0, n_q1, n_q2, n_arrow1, n_arrow2, n_label1, n_label2)

        with self.voiceover(text="""In a DFA, or Deterministic Finite Automaton, if you are in a state and see an input a, there is exactly one path you can take. It is predictable.""") as tracker:
            self.play(Create(dfa_group))
            dot = Dot(color=YELLOW).move_to(d_q0.get_center())
            self.play(FadeIn(dot))
            self.play(dot.animate.move_to(d_q1.get_center()), run_time=1)
            self.play(FadeOut(dot))

        with self.voiceover(text="""But in an NFA, a Non-Deterministic machine, seeing an input a might allow you to go to multiple different states at once, or nowhere at all. It is like parallel processing.""") as tracker:
            self.play(Create(nfa_group))
            dot = Dot(color=YELLOW).move_to(n_q0.get_center())
            self.play(FadeIn(dot))
            dot1 = dot.copy()
            dot2 = dot.copy()
            self.play(
                dot1.animate.move_to(n_q1.get_center()),
                dot2.animate.move_to(n_q2.get_center()),
                run_time=1.5
            )
            self.play(FadeOut(dot), FadeOut(dot1), FadeOut(dot2))

        self.wait(1)
        self.play(FadeOut(dfa_group), FadeOut(nfa_group), FadeOut(line), FadeOut(left_title), FadeOut(right_title))

        # ==========================================
        # SCENE 5: REGULAR EXPRESSIONS
        # ==========================================
        with self.voiceover(text="""Regular Expressions are the shorthand for these machines. Let us solve the problem: Strings that start with a and contain the substring b a.""") as tracker:
            problem = Text("Starts with a, contains ba", color=YELLOW).to_edge(UP)
            self.play(Write(problem))

        part1 = MathTex("a").scale(2).shift(LEFT*2)
        part2 = MathTex("(a+b)^*").scale(2).next_to(part1, RIGHT)
        part3 = MathTex("ba").scale(2).next_to(part2, RIGHT)
        part4 = MathTex("(a+b)^*").scale(2).next_to(part3, RIGHT)
        
        full_regex = VGroup(part1, part2, part3, part4).move_to(ORIGIN)

        with self.voiceover(text="""First, we must start with a. So we write a.""") as tracker:
            self.play(Write(part1))
            
        with self.voiceover(text="""Then, we need the substring b a. But it does not have to be immediately after the first a. There can be any noise in between.""") as tracker:
            self.play(Write(part3))
            self.play(part3.animate.shift(RIGHT*1))
            
        with self.voiceover(text="""We represent any noise with a or b star. Star means zero or more times.""") as tracker:
            self.play(Write(part2))
            
        with self.voiceover(text="""Finally, after we find b a, we do not care what comes after. So we add another a or b star at the end.""") as tracker:
            self.play(Write(part4))

        self.wait(1)
        self.play(Indicate(full_regex, color=GREEN))
        self.play(FadeOut(full_regex), FadeOut(problem))

        # ==========================================
        # SCENE 6: CHOMSKY HIERARCHY
        # ==========================================
        with self.voiceover(text="""Finally, the big picture: The Chomsky Hierarchy. This classifies languages by their complexity.""") as tracker:
            pass
            
        c0 = Circle(radius=3.5, color=WHITE).set_fill(GREY_E, 0.5)
        c1 = Circle(radius=2.6, color=RED).set_fill(MAROON_E, 0.5)
        c2 = Circle(radius=1.8, color=BLUE).set_fill(BLUE_E, 0.5)
        c3 = Circle(radius=1.0, color=GREEN).set_fill(GREEN_E, 0.5)

        l0 = Text("Recursively Enumerable", font_size=20).next_to(c0, UP, buff=-0.5)
        l1 = Text("Context Sensitive", font_size=20).next_to(c1, UP, buff=-0.5)
        l2 = Text("Context Free", font_size=20).next_to(c2, UP, buff=-0.5)
        l3 = Text("Regular", font_size=20).move_to(c3)

        group = VGroup(c0, c1, c2, c3, l0, l1, l2, l3).shift(DOWN*0.5)

        with self.voiceover(text="""At the center, we have Regular Languages. These are the simplest, recognized by Finite Automata.""") as tracker:
            self.play(DrawBorderThenFill(c3), Write(l3))

        with self.voiceover(text="""Surrounding them are Context-Free Languages. These require memory, a stack. They are recognized by Pushdown Automata.""") as tracker:
            self.play(DrawBorderThenFill(c2), Write(l2))

        with self.voiceover(text="""Then, Context-Sensitive Languages, recognized by Linear Bounded Automata.""") as tracker:
            self.play(DrawBorderThenFill(c1), Write(l1))

        with self.voiceover(text="""And finally, the most powerful class: Recursively Enumerable languages. These are recognized by Turing Machines. Anything a computer can compute lives here.""") as tracker:
            self.play(DrawBorderThenFill(c0), Write(l0))

        self.wait(2)
        
        # ==========================================
        # SCENE 7: OUTRO
        # ==========================================
        with self.voiceover(text="""I hope this visualization helps you map out the landscape of Automata Theory. Good luck with your revision!""") as tracker:
            self.play(FadeOut(group))
            thank_you = Text("Happy Coding!", font_size=48).set_color_by_gradient(YELLOW, ORANGE)
            self.play(Write(thank_you))
            self.wait(2)
            self.play(FadeOut(thank_you))
'''
    
    print("=" * 70)
    print("TRANSFORMER (ZOOM & PAN) TEST")
    print("=" * 70)
    
    result = generate_video_from_llm(
        code=code,
        transcript="",
        scene_name="AutomataTheoryDeepDive",
        quality="medium_quality",
        use_voiceover=True
    )
    
    print("\n" + "=" * 70)
    print("RESULT:")
    print(json.dumps(result, indent=2))
    print("=" * 70)
    
    if result["success"]:
        print("\n✅ SUCCESS! The Zoom & Pan functionality is working.")
        print(f"📊 File size: {result['file_size'] / (1024*1024):.2f} MB")
    else:
        print("\n❌ FAILED. If the error mentions regex or class, check manim_generator.py")
    
    return result["success"]

if __name__ == "__main__":
    test_custom_google_tts()