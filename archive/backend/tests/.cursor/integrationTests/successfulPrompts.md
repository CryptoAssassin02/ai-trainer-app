# Successful Integration Testing Prompts

## Plan Next Tests
    **Prompt 1:**
    Okay, based on the rough draft prompt below within <xml> tags, have we sufficiently tested the 'Profile Management Flow' of our backend?

    In considering this, you should ensure you read the tests currently within @integration as well as any profile related files within the backend directory. 

    You need to be absolutely certain (at least 98%) one way or another. 

    After you read through everything necessary, please present me with your findings and your determination of whether or not we've sufficiently tested the profile management flow. Do not implement or revise anything, we're just discussing and analyzing right now.

    <Rough_Draft_Prompt>
        Step 18D: Create Workout Plan Flow Tests 
        Prompt for Cursor: 
            Create workout plan flow integration tests:
	        1.	Create tests/integration/workout-flow.test.js:
                •	Test complete workout plan flow:
                •	Generate new workout plan
                •	Retrieve all plans
                •	Get specific plan
                •	Adjust plan based on feedback
                •	Delete plan
                •	Verify deletion
                •	Test edge cases:
                •	Invalid generation parameters
                •	Plan not found
                •	Invalid adjustment feedback
                •	Concurrent plan generation
	        2.	Include mock agents for faster tests:
                •	Mock Research Agent
                •	Mock Workout Generation Agent
                •	Mock Plan Adjustment Agent
        The integration tests should verify that the complete workout plan flow works end-to-end.
    </Rough_Draft_Prompt>

## Create Implementation Plan

    **Prompt 1:**
        If you are absolutely in your assessment above, let's proceed with brainstorming a thorough, detailed implementation plan for these completely and partially uncovered features. 

        ### Steps to Create Implementation Plan

        #### Read, Review, and Analyze

            1. Now, you'll need to systematically work through the completely uncovered and partially uncovered features from your assessment above - starting with '1. Separate Profile Preferences Endpoints'. Then, you'll work your way through the subsequent uncovered features after you work through all of the steps below for the first uncovered feature.

            2. For each uncovered feature, you must ensure you read, review, and analyze all relevant and applicable files within the backend to achieve a complete, thorough, and in-depth understanding of the feature and every single piece of the feature. You must be at least 98% certain you have achieved as full of an understanding as possible before proceeding to the next step.

            3. Then, once you've achieved as deep an understanding as possible regarding the feature as it currently stands within the backend, please proceed with searching the @Web and calling the context7 MCP tools to obtain the most up-to-date, official documentation related to the feature.
                a. This will allow us to ensure the feature is implemented properly to begin with. If we determine it's not, then we can update and correct the feature up front, only if necessary. 
                b. Then, once we can ensure that the feature is implemented properly and correctly, it will allow us to determine how to go about properly implementing integration tests for the feature.

        #### Formulate a Plan for Implementation

            1. Once you've worked through the steps above, you will formulate an initial, detailed implementation plan in your mind for the feature. 

            2. Then, you will re-analyze this inital plan to determine if you are at least 98% certain that the plan is proper, accurate, and in accordance with the up-to-date, official documentation.

        #### Finalize the Plan

            1. After you've either determined the initial plan was correct or it needed some revision, then you will finalize and present your final implementation plan for the feature. 

            2. Then, you will add the detailed plan for the feature to @profileManagementFlow.md. When you add it, you will add it in actionable steps that we're able to check off as we eventually begin to progress with implementing the tests. 

        #### Repeat the Steps for Next Feature

            1. Once you've made it to this point for the first uncovered feature, then you will proceed with the next uncovered feature - working your way through the same steps you just worked through for the first uncovered feature. 

            2. If you don't remember the steps of this prompt, they will be included as a reference within @successfulPrompts.md under **Prompt 1:** under @## Implement Plan.

    **Prompt 2:**
        If you are absolutely certain in your assessment above, let's proceed with brainstroming a thorough, detailed implementation plan for **all** uncovered features of the workout plan flow. 

        ### Steps to Create Implementation Plan

        #### Read, Review, and Analyze

            1. Now, based on your final, detailed assessment (the 4 phases), you'll need to systematically work through the workout plan flow features based on your implementation document structure in your response directly above (master overview, followed by 4 phases). You will start with the master overview and then work your way through the subsequent phases after you work through all of the steps below for the first document.

            2. For each feature and phase, you must ensure you read, review, and analyze all relevant and applicable files within the backend to achieve a complete, thorough, and in-depth understanding of the feature and every single piece of the features. You must be at least 98% certain you have achieved as full of an understanding as possible before proceeding to the next step.

            3. Then, once you've achieved as deep an understanding as possible regarding the feature(s) and the phase as it currently stands within the backend, please proceed with searching the @Web and calling the context7 MCP tools to obtain the most up-to-date, official documentation related to the feature. 
                a. This will allow us to ensure the feature(s) is/are implemented properly within the backend to begin with. If we determine it/they is/are not, then we can update and correct the feature up front, only if necessary.
                b. Then, once we can ensure that the feature(s) is/are implemented properly and correctly, it will allow us to determine how to go about properly implementing integration tests for the feature(s).
                c. Ensure you read the @profileMgmtFlowRules.md in entirety to determine if any of the rules, best practices, and successful test methods can be utilized or applied to the workout plan flow implementation plans.

        #### Formulate a Plan for Implementation

            1. Once you've worked through the steps above, you will formulate an initial, detailed implementation plan in your mind for the feature(s) or phase.

            2. Then, you will re-analyze this initial plan to determine if you are at least 98% certain that the plan is proper, accurate, and in accordance with the up-to-date, official documentation.

        #### Finalize the Plan

            1. After you've either determined the initial plan was correct or it needed some revision, then you will finalize and present your final implementation plan for the feature.

            2. Then, you will add the detailed plan for the feature(s) or phase to @workoutPlanFlow. The @workoutPlanFlow.md document has been created, but the other documents for the phases themselves will need to be created yet.
                a. When you add the document(s), you will add it in actionable steps that we're able to check off as we eventually begin to proceed with implementing the tests.
                b. For reference, please review the @profileManagementFlow.md as to how detailed the implementation plans should be.

        #### Repeat the Steps for Next Feature(s)/Phase

            1. Once you've made it to this point for the first workout plan flow integration test implementation document (@workoutPlanFlow.md), you will then proceed with the next phase/document - working your way through the same steps you just worked through for the first document/phase.

            2. If you don't remember the steps of this prompt, they will be included as a reference within @successfulPrompts.md under @## Create Implementation Plan and `**Prompt 2:**`. 

## Implement Integration Test

    **Prompt 1:**
        ## Implementation Process

        ### Review of the Plan

            1. Before you implement anything related to the integration tests, you must first thoroughly review the entire implementation plan for @## Feature #1: Separate Profile Preferences Endpoints Integration Tests (lines 7-112).

            2. In doing so, you will review the entire plan in addition to and against a thorough review of the feature and files applicable to this integration test. You must be as thorough as possible and ensure you are absolutely certain and confident (at least 98% certainty) in the implementation plan before you proceed to implement anything. You should also search the @Web and call the context7 MCP tools to ensure our plan is aligned with official, up-to-date documentation. 

        ### Implementing the Integration Test

            1. At this point, you will create the integration test file within @profileManagementFlow. 

            2. To ensure the tests properly run in the real, local Supabase instance, you should review the other tests within  and gain an understanding of the config, setup, etc. files utilized by those tests. This is imperative to get correct, this is not a unit, contract, or implementation test with mocks. This is a test that is ran in a real, local Supabase instance. So be thorough and meticulous in ensuring you get this correct. 

            3. Before implementation, you should also review the @rules.md file to ensure that our plan is aligned with our rules, best practices, and successful test methods that we found in other files.

            4. Now, you will begin to systematically work through the implementation of the integration test. You will explicitly follow the implementation plan for this specific feature. You will approach this with surgical precision and laser-focus. Proceed in this manner until all of @## Feature #1: Separate Profile Preferences Endpoints Integration Tests is completed and the integration tests related to this feature are fully and perfectly implemented.

        ### Verifying the Tests Pass and Our Implementations Are Correct

            1. Once you've fully implemented the integration tests for this feature, you will run the tests to verify the tests were properly implemented and the feature itself was properly implemented. 

            2. To run the test, you should first stop the current supabase instance. Then, after ensuring we're in the backend (backend ID), you will then start a new supabase instance. Once it starts correctly, you will reset the supabase db instance. 

            3. Then you can run the tests, using the command within @## Proper Commands or some variation of that command, to run this specific integration test suite. 

            4. If failures or issues arise, we will need to debug those through critical thinking and deep investigative work. 

            5. Once we've verified the implementation of the feature is correct and all tests pass, stop, and ask me if you're ready to proceed with next feature implementation. **Do not proceed with the next feature.**

## Debug

## Review What's Been Done

    **Prompt 1:** 
        Amazing. We now have 4 successful integration tests implemented - @auth.integration.test.js, @authorizationMiddleware.integration.test.js, @profile.integration.test.js, and @rateLimiting.integration.test.js.

        Now, I need you to do the following:

        ### Review the Files

            1. Thoroughly review the 4 files mentioned above to get a complete understanding of each of the files. 

        ### General Rules for Integration Test Implementation

            1. After you've completed your thorough review of each of the 4 files, review the files again to come up with a list of general rules to follow for future implementations of integration tests. 

            2. Once you're certain you've identified the best and most applicable list of rules, please add them to @rules.md under @## General Rules for Integration Test Implementation.

        ### General Best Practices

            1. Now, you will review the files again to come up with a list of general best practices to adhere to for future implementations of integration tests.

            2. Once you're certain you've identified the most applicable list of best practices, please add them to @rules.md under @## General Best Practices. 

        ### Successful and Unsuccessful Test Methods

            1. Now, review each file individually once more. During this review of each file, you will be identifying the successful and unsuccessful test methods for each of the 4 files listed above.

            2. As you review each file individually, you will be considering what test methods were successful and unsuccessful.

            3. Once you're through your review of the first file, you will add the identified successful test methods for the specific file under @## Successful Test Methods and under the applicable test file. You will then do the same under @## Unsuccessful Test Methods for the applicable test file.

            4. You will continue following these 3 steps until you've added all successful and unsuccessful test methods for the applicable files. 